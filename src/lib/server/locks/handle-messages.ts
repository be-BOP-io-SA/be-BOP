import { ObjectId, type ChangeStreamDocument, type ChangeStream } from 'mongodb';
import { collections } from '../database';
import { Lock } from '../lock';
import type { NostRReceivedMessage } from '$lib/types/NostRReceivedMessage';
import { Kind } from 'nostr-tools';
import { ORIGIN } from '$env/static/private';
import { refreshPromise, runtimeConfig } from '../runtime-config';
import { toSatoshis } from '$lib/utils/toSatoshis';
import { addSeconds, formatDistance, subMinutes } from 'date-fns';
import { addToCartInDb, getCartFromDb, removeFromCartInDb } from '../cart';
import type { Product } from '$lib/types/Product';
import { typedInclude } from '$lib/utils/typedIncludes';
import { createOrder } from '../orders';
import { building } from '$app/environment';
import { paymentMethods } from '../payment-methods';
import { userQuery } from '../user';
import { rateLimit } from '../rateLimit';
import type { Price } from '$lib/types/Order';
import { sendAuthentificationlink } from '../sendNotification';
import { parseNostrMessage, type ParsedNostrMessage } from './nostr-message-parser';

const lock = new Lock('received-messages');

const processingIds = new Set<string>();

export const NOSTR_PROTOCOL_VERSION = 1;

let changeStream: ChangeStream<NostRReceivedMessage>;

function watch() {
	try {
		rateLimit('0.0.0.0', 'changeStream.handle-messages', 10, { minutes: 5 });
	} catch {
		console.error("Too many change streams errors for 'handle-messages', exiting");
		process.exit(1);
	}
	changeStream = collections.nostrReceivedMessages.watch(
		[{ $match: { operationType: 'insert' } }],
		{
			fullDocument: 'updateLookup'
		}
	);
	changeStream.on('change', (ev) => handleChanges(ev).catch(console.error));
	changeStream.on('error', (err) => {
		console.error('handle-messages', err);
		changeStream.close().catch(console.error);
		watch();
	});
}

if (!building) {
	watch();
}

async function handleChanges(change: ChangeStreamDocument<NostRReceivedMessage>): Promise<void> {
	if (!lock.ownsLock || !('fullDocument' in change) || !change.fullDocument) {
		return;
	}

	await handleReceivedMessage(change.fullDocument);
}

lock.onAcquire = async () => {
	const unprocessedMessages = collections.nostrReceivedMessages.find({
		processedAt: { $exists: false }
	});

	for await (const message of unprocessedMessages) {
		await handleReceivedMessage(message).catch(console.error);
	}
};

async function handleReceivedMessage(message: NostRReceivedMessage): Promise<void> {
	if (message.processedAt || processingIds.has(message._id)) {
		return;
	}

	processingIds.add(message._id);

	try {
		const updatedMessage = await collections.nostrReceivedMessages.findOne({ _id: message._id });

		if (!updatedMessage || updatedMessage.processedAt) {
			return;
		}

		await refreshPromise;

		message = updatedMessage;

		const senderNpub = message.source;
		const minCreatedAt = addSeconds(message.createdAt, 1);

		const isCustomer =
			(await collections.nostrNotifications.countDocuments({ dest: senderNpub }, { limit: 1 })) > 0;
		const isPrivateMessage = message.kind === Kind.EncryptedDirectMessage;

		const send = (msg: string) => sendMessage(senderNpub, msg, minCreatedAt);

		// --- NEW PARSING LOGIC ---
		const parsedMessage = parseNostrMessage(message.content);

		if (parsedMessage.errors.length > 0) {
			// Handle parsing errors, e.g., send error message to user
			await send(
				`Sorry, I couldn't understand your command. Errors:\n${parsedMessage.errors.join('\n')}`
			);
			// Mark as processed even if there are parsing errors to avoid reprocessing
			await collections.nostrReceivedMessages.updateOne(
				{ _id: message._id },
				{ $set: { processedAt: new Date(), updatedAt: new Date() } }
			);
			return;
		}

		const commandName = parsedMessage.command;
		let matched = false;

		const commandHandler = commands[commandName];

		if (commandHandler) {
			matched = true;

			if (commandHandler.maintenanceBlocked && runtimeConfig.isMaintenance) {
				await send(
					`Sorry, ${runtimeConfig.brandName} / ${ORIGIN} is currently under maintenance, try again later.`
				);
			} else {
				// Pass parsed options and variadic argument directly to the command handler
				await commandHandler.execute(send, {
					senderNpub,
					parsedCommand: parsedMessage // Pass the entire parsed object
				});
			}
		}

		// --- END NEW PARSING LOGIC ---

		if (
			!matched &&
			!message.tags?.some(([key]) => key === 'bootikVersion') &&
			!runtimeConfig.disableNostrBotIntro &&
			isPrivateMessage
		) {
			await send(
				`Hello ${isCustomer ? 'customer' : 'you'}! To get the list of commands, say '!help'.`
			);
		}
		await collections.nostrReceivedMessages.updateOne(
			{ _id: message._id },
			{ $set: { processedAt: new Date(), updatedAt: new Date() } }
		);
	} finally {
		processingIds.delete(message._id);
	}
}

async function sendMessage(dest: string, content: string, minCreatedAt: Date) {
	const lastMessage = await collections.nostrNotifications.countDocuments({
		dest,
		content,
		createdAt: { $gt: subMinutes(new Date(), 1) }
	});

	// Do not send the same message twice in a minute, avoid larsen effect
	if (lastMessage) {
		return;
	}

	return collections.nostrNotifications.insertOne({
		dest,
		_id: new ObjectId(),
		createdAt: new Date(),
		updatedAt: new Date(),
		minCreatedAt,
		kind: Kind.EncryptedDirectMessage,
		content
	});
}

const commands: Record<
	string,
	{
		description: string;
		execute: (
			send: (message: string) => Promise<unknown>,
			params: { senderNpub: string; parsedCommand: ParsedNostrMessage }
		) => Promise<void>;
		maintenanceBlocked?: boolean;
	}
> = {
	'!help': {
		description: 'Show the list of commands',
		execute: async (send, { senderNpub }) => {
			await send(
				`Available commands\n\n` +
					(
						await Promise.all(
							Object.entries(commands).map(
								async ([name, { description }]) =>
									`- ${await usage(name, senderNpub)}: ${description}`
							)
						)
					).join('\n')
			);
		}
	},
	'!catalog': {
		description:
			'Show the list of products with optional filters and display modes. Usage: !catalog [s:<searchterm>] [t:<type>] [m:<mode>]',
		execute: async (send, { parsedCommand }) => {
			if (!runtimeConfig.discovery) {
				await send('Discovery is not enabled for this bootik. You cannot access the catalog.');
				return;
			}
			console.log(parsedCommand);
			const { options, variadicArg } = parsedCommand;

			const query: Record<string, unknown> = {
				'actionSettings.eShop.visible': true,
				'actionSettings.nostr.visible': true
			};

			const searchTerm = (options.s as string) || variadicArg;

			if (searchTerm) {
				const searchRegex = new RegExp(searchTerm, 'i');
				query.$or = [
					{ name: { $regex: searchRegex } },
					{ shortDescription: { $regex: searchRegex } },
					{ longDescription: { $regex: searchRegex } }
				];
			}

			// Apply type filters (from 't' option)
			const types = (options.t as string[]) || []; // 't' option can be an array

			if (types.length > 0) {
				const typeConditions: Record<string, unknown>[] = [];
				const invalidTypes: string[] = [];
				for (const type of types) {
					switch (
						type.toLowerCase() // Ensure type is lowercase for matching
					) {
						case 'digital':
							typeConditions.push({ shipping: false });
							break;
						case 'ship':
							typeConditions.push({ shipping: true });
							break;
						case 'free':
							typeConditions.push({ 'price.amount': 0 });
							break;
						case 'pwyw':
							typeConditions.push({ payWhatYouWant: true });
							break;
						case 'event':
							typeConditions.push({ isEvent: true });
							break;
						case 'preorder':
							typeConditions.push({ 'preorder.enabled': true });
							break;
						case 'sub':
							typeConditions.push({ isSubscription: true });
							break;
						case 'tip':
							typeConditions.push({ isTip: true });
							break;
						default:
							invalidTypes.push(type);
							break;
					}
				}
				if (invalidTypes.length > 0) {
					await send(
						`Invalid product type(s) found: ${invalidTypes.join(', ')}. Valid types are: ${[
							'digital',
							'ship',
							'free',
							'pwyw',
							'event',
							'preorder',
							'sub',
							'tip'
						].join(', ')}.`
					);
					return;
				}
				if (typeConditions.length > 0) {
					query.$and = ((query.$and as unknown[]) || []).concat(typeConditions);
				}
			}

			// Determine display mode
			let displayMode = 'mid' as 'light' | 'mid' | 'full'; // Default
			const modeOption = options.m as string; // 'm' option is a single string

			if (modeOption) {
				if (typedInclude(['light', 'mid', 'full'], modeOption.toLowerCase())) {
					displayMode = modeOption.toLowerCase() as typeof displayMode;
				} else {
					await send(
						`Invalid display mode: '${modeOption}'. Valid modes are: ${[
							'light',
							'mid',
							'full'
						].join(', ')}.`
					);
					return;
				}
			}

			const products = await collections.products.find(query).toArray();

			if (!products.length) {
				await send('No products found matching your criteria.');
				return;
			}

			// Function to format a single product based on the mode
			const formatProduct = (product: Product, mode: typeof displayMode): string => {
				const satoshisPrice = toSatoshis(
					product.price.amount,
					product.price.currency
				).toLocaleString('en-US');
				const productUrl = `${ORIGIN}/product/${product._id}`;

				switch (mode) {
					case 'light':
						return `- ${product.name} [ref: "${product._id}"] / ${satoshisPrice} SAT`;
					case 'mid': // Default
						return `- ${product.name} [ref: "${product._id}"] / ${satoshisPrice} SAT / ${productUrl}`;
					case 'full':
						return `- ${product.name} [ref: "${
							product._id
						}"] / ${satoshisPrice} SAT / ${productUrl} / ${product.shortDescription.replaceAll(
							/\s+/g,
							' '
						)} ${
							product.description
								? `(Long Description: ${product.description.replaceAll(/\s+/g, ' ')})`
								: ''
						}`;
					default:
						return `- ${product.name} [ref: "${product._id}"] / ${satoshisPrice} SAT / ${productUrl}`;
				}
			};

			await send(products.map((p) => formatProduct(p, displayMode)).join('\n'));
		}
	},
	'!add': {
		description: 'Add a product to your cart',
		maintenanceBlocked: true,
		execute: async (send, { senderNpub, parsedCommand }) => {
			const ref = parsedCommand.variadicArg;
			let quantity = parseInt((parsedCommand.options.quantity as string) || '1');

			if (!ref) {
				await send('Invalid syntax. Usage: "!add <ref> [quantity]". <ref> is missing.');
				return;
			}

			if (isNaN(quantity) || quantity <= 0) {
				await send(
					'Invalid quantity: ' +
						((parsedCommand.options.quantity as string) || parsedCommand.variadicArg)
				);
				return;
			}

			const product = await collections.products.findOne({ _id: ref });

			if (!product) {
				const products = await collections.products
					.find({})
					.project<Pick<Product, '_id'>>({ _id: 1 })
					.toArray();
				await send(
					`No product found with ref "${ref}". Use "catalog" to get the list of products. Available refs: ${products
						.map((p) => p._id)
						.join(', ')}`
				);
				return;
			}
			if (!product.actionSettings.nostr.canBeAddedToBasket) {
				await send('Sorry, this product cannot be ordered through Nostr');
				return;
			}

			if (product.shipping) {
				await send(
					`Sorry, this product has a physical component and cannot be ordered through Nostr`
				);
				return;
			}

			if (product.deposit?.enforce) {
				await send(
					`Sorry, this product cannot be ordered through Nostr due to the deposit mechanism`
				);
				return;
			}

			if (product.standalone && product.hasVariations) {
				await send(`Sorry, this product has variations and cannot be ordered through Nostr`);
				return;
			}

			let customPrice: Price | undefined = undefined;
			if (product.payWhatYouWant) {
				customPrice = {
					amount: quantity,
					currency: 'SAT'
				};

				if (product.maximumPrice && toSatoshis(customPrice) > toSatoshis(product.maximumPrice)) {
					await send(
						`Product price must be less than ${toSatoshis(product.maximumPrice).toLocaleString(
							'en-US'
						)} SAT.`
					);
					return;
				}

				if (toSatoshis(customPrice) < toSatoshis(product.price)) {
					await send(
						`Product price must be greater than ${toSatoshis(product.price).toLocaleString(
							'en-US'
						)} SAT. For example, !add ${ref} ${toSatoshis(product.price)}`
					);
					return;
				}

				quantity = 1;
			}

			const cart = await addToCartInDb(product, quantity, {
				user: { npub: senderNpub },
				customPrice,
				mode: 'nostr'
			}).catch(async (e) => {
				console.error(e);
				await send(e.message);
				return;
			});

			if (!cart) {
				return;
			}

			const item = cart.items.find((item) => item.productId === product._id);

			if (!item) {
				return;
			}

			await send(
				`"${product.name}" added to cart for a total quantity of ${
					item.quantity
				} and price of ${toSatoshis(
					(item.customPrice ?? product.price).amount * item.quantity,
					(item.customPrice ?? product.price).currency
				).toLocaleString('en-US')} SAT`
			);
		}
	},
	'!cart': {
		description: 'Show the contents of your cart',
		maintenanceBlocked: true,
		execute: async (send, { senderNpub }) => {
			// Reverted to original signature
			const cart = await getCartFromDb({ user: { npub: senderNpub } });

			if (!cart || !cart.items.length) {
				await send('Your cart is empty');
			} else {
				const products = await collections.products
					.find({ _id: { $in: cart.items.map((item) => item.productId) } })
					.toArray();
				const productById = Object.fromEntries(products.map((product) => [product._id, product]));

				let totalPrice = 0;
				const items = cart.items
					.filter((item) => productById[item.productId])
					.map((item) => {
						const product = productById[item.productId];
						const price = toSatoshis(
							(item.customPrice?.amount ?? product.price.amount) * item.quantity,
							item.customPrice?.currency ?? product.price.currency
						);
						totalPrice += price;
						return `- ref: "${product._id}" / ${price.toLocaleString('en-US')} SAT / Quantity: ${
							item.quantity
						}`;
					});
				await send(
					items.join('\n') +
						`\n\nTotal: ${totalPrice.toLocaleString('en-US')} SAT. Type "checkout" to pay.`
				);
			}
		}
	},
	'!remove': {
		description: 'Remove a product from your cart',
		maintenanceBlocked: true,
		execute: async (send, { senderNpub, parsedCommand }) => {
			const ref = parsedCommand.variadicArg; // Assuming 'ref' is the variadic argument
			const quantity =
				parsedCommand.options.quantity === 'all'
					? Infinity
					: parseInt((parsedCommand.options.quantity as string) || 'all');

			if (!ref) {
				await send('Invalid syntax. Usage: "!remove <ref> [quantity|all]". <ref> is missing.');
				return;
			}

			if (isNaN(quantity) || quantity < 0) {
				await send(
					'Invalid quantity: ' +
						((parsedCommand.options.quantity as string) || parsedCommand.variadicArg)
				);
				return;
			}
			const product = await collections.products.findOne({ _id: ref });

			if (!product) {
				await send(
					'No product found with ref: ' + ref + '. Use "catalog" to get the list of products'
				);
				return;
			}

			const cart = await removeFromCartInDb(product, quantity, {
				user: {
					npub: senderNpub
				}
			}).catch(async (e) => {
				console.error(e);
				await send(e.message);
				return null;
			});

			if (!cart) {
				return;
			}

			const item = cart.items.find((item) => item.productId === product._id);

			if (!item) {
				await send(`"${product.name}" removed from cart`);
				return;
			}

			await send(
				`"${product.name}" remaining in your cart for a total quantity of ${
					item.quantity
				} and price of ${toSatoshis(
					item.quantity * product.price.amount,
					product.price.currency
				).toLocaleString('en-US')} SAT`
			);
		}
	},
	'!checkout': {
		description: 'Checkout your cart',
		maintenanceBlocked: true,
		execute: async (send, { senderNpub, parsedCommand }) => {
			const paymentMethod = parsedCommand.variadicArg;

			if (!paymentMethod) {
				const availablePaymentMethods = paymentMethods().filter((m) => m !== 'free');
				await send(
					`Invalid syntax. Usage: "!checkout <paymentMethod>". Payment method is missing. Available: ${availablePaymentMethods.join(
						', '
					)}.`
				);
				return;
			}
			// ... rest of the !checkout logic
			const cart = await getCartFromDb({ user: { npub: senderNpub } });

			if (!cart) {
				await send("Your cart is empty, you can't checkout an empty cart");
				return;
			}

			const products = await collections.products
				.find({ _id: { $in: cart.items.map((i) => i.productId) } })
				.toArray();

			if (products.some((product) => product.shipping)) {
				await send(
					'Some products in your cart require shipping, this is not yet supported by the bot. Please remove them from your cart or use the website to checkout'
				);
				return;
			}
			if (runtimeConfig.isBillingAddressMandatory) {
				await send(
					`This beBOP is configured to always require a billing address, but this is not supported yet via NostR`
				);
				return;
			}

			if (runtimeConfig.collectIPOnDeliverylessOrders) {
				await send(
					`Sorry, this beBOP requires an IP address or shipping address for each order, which is not possible via NostR at the moment`
				);
				return;
			}

			const productById = Object.fromEntries(products.map((p) => [p._id, p]));

			const items = cart.items
				.filter((i) => productById[i.productId])
				.map((i) => ({
					quantity: i.quantity,
					product: productById[i.productId],
					depositPercentage: i.depositPercentage,
					customPrice: i.customPrice,
					chosenVariations: i.chosenVariations
				}));

			const availablePaymentMethods = paymentMethods().filter((m) => m !== 'free');
			if (!typedInclude(availablePaymentMethods, paymentMethod)) {
				await send(
					'Invalid payment method: ' +
						paymentMethod +
						'. Available payment methods: ' +
						availablePaymentMethods.join(', ')
				);
				return;
			}

			await createOrder(items, paymentMethod, {
				locale: 'en',
				notifications: {
					paymentStatus: {
						npub: senderNpub
					}
				},
				user: {
					npub: senderNpub
				},
				userVatCountry: undefined,
				shippingAddress: null,
				cart
			}).catch(async (e) => {
				console.error(e);
				await send(e.message);
				return;
			});
		}
	},
	'!orders': {
		description: 'Show your orders',
		execute: async (send, { senderNpub }) => {
			const orders = await collections.orders
				.find(userQuery({ npub: senderNpub }))
				.sort({ createdAt: -1 })
				.limit(100)
				.toArray();

			if (orders.length) {
				await send(
					orders.map((order) => `- #${order.number}: ${ORIGIN}/order/${order._id}`).join('\n')
				);
			} else {
				await send('No orders found for your npub');
			}
		}
	},
	'!subscribe': {
		description: 'Subscribe to catalog updates',
		execute: async (send, { senderNpub }) => {
			if (!runtimeConfig.discovery) {
				await send('Discovery is not enabled for the bootik, you cannot subscribe');
			} else {
				await collections.bootikSubscriptions.updateOne(
					{ npub: senderNpub },
					{
						$set: {
							updatedAt: new Date()
						},
						$setOnInsert: {
							createdAt: new Date()
						}
					},
					{ upsert: true }
				);
				await send(
					'You are subscribed to the catalog, you will receive messages when new products are added'
				);
			}
		}
	},
	'!unsubscribe': {
		description: 'Unsubscribe from catalog updates',
		execute: async (send, { senderNpub }) => {
			const result = await collections.bootikSubscriptions.deleteOne({ npub: senderNpub });

			if (result.deletedCount) {
				await send('You are unsubscribed from the catalog');
			} else {
				await send('You were already unsubscribed from the catalog');
			}
		}
	},
	'!subscriptions': {
		description: 'Show your paid subscriptions',
		execute: async (send, { senderNpub }) => {
			{
				const subscriptions = await collections.paidSubscriptions
					.find({ npub: senderNpub, paidUntil: { $gt: new Date() } })
					.sort({ number: 1 })
					.toArray();

				if (!subscriptions.length) {
					await send('No active subscriptions found for your npub');
				} else {
					await send(
						subscriptions
							.map(
								(subscription) =>
									`- #${subscription.number}: ${ORIGIN}/subscription/${
										subscription._id
									}, end: ${formatDistance(subscription.paidUntil, new Date(), {
										addSuffix: true
									})}${subscription.cancelledAt ? ' [cancelled]' : ''}`
							)
							.join('\n')
					);
				}
			}
		}
	},
	'!cancel': {
		description: 'Cancel a paid subscription',
		execute: async (send, { senderNpub, parsedCommand }) => {
			const number = parseInt(parsedCommand.variadicArg, 10);

			if (isNaN(number)) {
				await send('Invalid subscription number: ' + parsedCommand.variadicArg);
				return;
			}

			const subscription = await collections.paidSubscriptions.findOne({
				npub: senderNpub,
				number
			});

			if (!subscription) {
				await send('No subscription found with number ' + number + ' for your npub');
				return;
			}

			if (subscription.cancelledAt) {
				await send('Subscription #' + number + ' was already cancelled');
				return;
			}

			await collections.paidSubscriptions.updateOne(
				{ _id: subscription._id },
				{ $set: { cancelledAt: new Date() } }
			);

			await send('Subscription #' + number + ' was cancelled, you will not be reminded anymore');
		}
	},
	'!session': {
		description: 'Request a temporary session link',
		execute: async (send, { senderNpub }) => {
			if (0) {
				send('you will receive your temporary link soon...');
			}
			await sendAuthentificationlink({ npub: senderNpub });
		}
	}
};

async function usage(commandName: string, senderNpub: string) {
	console.log(senderNpub);

	return commandName;
}
/**async function usage(commandName: string, senderNpub: string) {
	const command = commands[commandName];

	return `${commandName} ${(
		await Promise.all(
			(command.args || []).map(
				async (arg) =>
					` [${
						arg.enum
							? (typeof arg.enum === 'function' ? await arg.enum(senderNpub) : arg.enum).join('|')
							: arg.name
					}${arg.default ? `=${arg.default}` : ''}]`
			)
		)
	).join('')}`.trim();
}**/
