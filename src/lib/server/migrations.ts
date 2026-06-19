import { ClientSession, ObjectId } from 'mongodb';
import { collections, withTransaction } from './database';
import { marked } from 'marked';
import { env } from '$env/dynamic/private';
import type { OrderPayment } from '$lib/types/Order';
import { Lock } from './lock';
import { ORIGIN } from '$lib/server/env-config';
import type { PosPaymentSubtype } from '$lib/types/PosPaymentSubtype';
import { CURRENCIES, FRACTION_DIGITS_PER_CURRENCY } from '$lib/types/Currency';
import { isPublicZeroCriteriaDiscount, publicDiscountPriceSnapshot } from './discount';
import type { SubscriptionDuration } from '$lib/types/SubscriptionDuration';

async function ensureDefaultSearchlist(session?: ClientSession): Promise<void> {
	const existing = await collections.searchlists.findOne({ _id: 'default' }, { session });
	if (existing) {
		return;
	}
	const now = new Date();
	await collections.searchlists.insertOne(
		{
			_id: 'default',
			name: 'default',
			displayWidgetName: false,
			hideSearchbar: true,
			prefillSearchterm: false,
			hideSearchterm: false,
			searchTargets: {
				title: true,
				shortDescription: true,
				longDescription: true,
				productTags: false,
				productVariation: false,
				productCustomCta: false,
				productCmsBefore: false,
				productCmsAfter: false
			},
			filters: {
				price: { enabled: false },
				stock: { enabled: false, defaultChecked: false },
				tags: { enabled: false, allowedTagIds: [] }
			},
			sort: {
				displayed: false,
				options: ['alphaAsc', 'alphaDesc', 'priceAsc', 'priceDesc', 'createdAsc', 'createdDesc'],
				default: 'alphaAsc'
			},
			view: { default: 'grid', hideToggle: true },
			pagination: { mode: 'loadMore', perPage: 12 },
			createdAt: now,
			updatedAt: now
		},
		{ session }
	);
}

async function ensureSearchSearchlist(session?: ClientSession): Promise<void> {
	const existing = await collections.searchlists.findOne({ _id: 'search' }, { session });
	if (existing) {
		return;
	}
	const now = new Date();
	await collections.searchlists.insertOne(
		{
			_id: 'search',
			name: 'Recherche',
			displayWidgetName: false,
			hideSearchbar: false,
			prefillSearchterm: false,
			hideSearchterm: false,
			searchTargets: {
				title: true,
				shortDescription: true,
				longDescription: true,
				productTags: false,
				productVariation: false,
				productCustomCta: false,
				productCmsBefore: false,
				productCmsAfter: false
			},
			filters: {
				price: { enabled: true },
				stock: { enabled: true, defaultChecked: false },
				tags: { enabled: false, allowedTagIds: [] }
			},
			sort: {
				displayed: true,
				options: ['alphaAsc', 'alphaDesc', 'priceAsc', 'priceDesc', 'createdAsc', 'createdDesc'],
				default: 'alphaAsc'
			},
			view: { default: 'grid', hideToggle: false },
			pagination: { mode: 'loadMore', perPage: 12 },
			createdAt: now,
			updatedAt: now
		},
		{ session }
	);
}

export const migrations = [
	{
		_id: new ObjectId('65281201e92e590e858af6cb'),
		name: 'Migrate CMS page content from Markdown to HTML',
		run: async (session: ClientSession) => {
			for await (const page of collections.cmsPages.find()) {
				await collections.cmsPages.updateOne(
					{
						_id: page._id
					},
					{
						$set: {
							content: marked(page.content)
						}
					},
					{ session }
				);
			}
		}
	},
	{
		_id: new ObjectId('39811201e92e590e858af8ba'),
		name: 'Adding actionSettings to products',
		run: async (session: ClientSession) => {
			await collections.products.updateMany(
				{},
				{
					$set: {
						actionSettings: {
							eShop: {
								visible: true,
								canBeAddedToBasket: true
							},
							retail: {
								visible: true,
								canBeAddedToBasket: true
							},
							googleShopping: {
								visible: true
							},
							nostr: {
								visible: true,
								canBeAddedToBasket: true
							}
						}
					}
				},
				{ session }
			);
		}
	},
	{
		_id: new ObjectId('653cbb1bd2af1254e82c928b'),
		name: 'Change user.backupInfo to user.recovery',
		run: async (session: ClientSession) => {
			await collections.users.dropIndex('backupInfo.npub_1').catch(console.error);
			await collections.users.dropIndex('backupInfo.email_1').catch(console.error);

			await collections.users.updateMany(
				{
					backupInfo: { $exists: true }
				},
				{
					$rename: {
						backupInfo: 'recovery'
					}
				},
				{ session }
			);
		}
	},
	{
		name: 'Add tagIds to products',
		_id: new ObjectId('653cbb1bd2af1254e82c928c'),
		run: async (session: ClientSession) => {
			await collections.products.updateMany(
				{
					tagIds: { $exists: false }
				},
				{
					$set: {
						tagIds: []
					}
				},
				{ session }
			);
		}
	},
	{
		name: 'Add amountsInOtherCurrencies to orders',
		_id: new ObjectId('6567c2700000000000000000'),
		run: async (session: ClientSession) => {
			for await (const order of collections.orders.find(
				{ amountsInOtherCurrencies: { $exists: false } },
				{ session }
			)) {
				// @ts-expect-error migration stuff
				order.amountsInOtherCurrencies = {
					main: {
						// @ts-expect-error migration stuff
						...('totalReceived' in order.payment &&
							// @ts-expect-error migration stuff
							typeof order.payment.totalReceived === 'number' && {
								totalReceived: {
									currency: 'SAT',
									// @ts-expect-error migration stuff
									amount: order.payment.totalReceived
								}
							}),
						totalPrice: {
							// @ts-expect-error migration stuff
							currency: order.totalPrice.currency,
							// @ts-expect-error migration stuff
							amount: order.totalPrice.amount
						},
						...(order.vat && {
							vat: {
								// @ts-expect-error migration stuff
								currency: order.vat.price.currency,
								// @ts-expect-error migration stuff
								amount: order.vat.price.amount
							}
						})
					},
					priceReference: {
						// @ts-expect-error migration stuff
						...('totalReceived' in order.payment &&
							// @ts-expect-error migration stuff
							typeof order.payment.totalReceived === 'number' && {
								totalReceived: {
									currency: 'SAT',
									// @ts-expect-error migration stuff
									amount: order.payment.totalReceived
								}
							}),
						totalPrice: {
							// @ts-expect-error migration stuff
							currency: order.totalPrice.currency,
							// @ts-expect-error migration stuff
							amount: order.totalPrice.amount
						},
						...(order.vat && {
							vat: {
								// @ts-expect-error migration stuff
								currency: order.vat.price.currency,
								// @ts-expect-error migration stuff
								amount: order.vat.price.amount
							}
						})
					}
				};
				for (const item of order.items) {
					// @ts-expect-error migration stuff
					item.amountsInOtherCurrencies = {
						main: {
							price: {
								currency: item.product.price.currency,
								amount: item.product.price.amount * item.quantity
							}
						},
						priceReference: {
							price: {
								currency: item.product.price.currency,
								amount: item.product.price.amount * item.quantity
							}
						}
					};
				}

				await collections.orders.updateOne(
					{ _id: order._id },
					{
						$set: {
							// @ts-expect-error migration stuff
							amountsInOtherCurrencies: order.amountsInOtherCurrencies,
							items: order.items
						}
					},
					{ session }
				);
			}
		}
	},
	{
		name: 'Convert to multiple payments',
		_id: new ObjectId('65713a19c783f535de973957'),
		run: async (session: ClientSession) => {
			for await (const order of collections.orders.find(
				{ payments: { $exists: false }, payment: { $exists: true } },
				{ session }
			)) {
				for (const item of order.items) {
					// @ts-expect-error migration stuff
					item.currencySnapshot = item.amountsInOtherCurrencies ?? item.currencySnapshot;
				}
				// @ts-expect-error migration stuff
				order.currencySnapshot = order.amountsInOtherCurrencies ?? order.currencySnapshot;
				// @ts-expect-error migration stuff
				const legacyPayment: OrderPayment = order.payment;
				const payment: OrderPayment = {
					...legacyPayment,
					_id: new ObjectId(),
					// @ts-expect-error migration stuff
					price: order.totalPrice,
					currencySnapshot: {
						// @ts-expect-error migration stuff
						main: order.currencySnapshot.main.totalPrice,
						// @ts-expect-error migration stuff
						priceReference: order.currencySnapshot.priceReference.totalPrice,
						// @ts-expect-error migration stuff
						secondary: order.currencySnapshot.secondary?.totalPrice
					},
					// @ts-expect-error migration stuff
					lastStatusNotified: order.lastPaymentStatusNotified,
					// @ts-expect-error migration stuff
					invoice: order.invoice
				};
				await collections.orders.updateOne(
					{ _id: order._id },
					{
						$set: {
							payments: [payment],
							items: order.items,
							status: payment.status,
							currencySnapshot: order.currencySnapshot
						},
						$unset: {
							payment: '',
							amountsInOtherCurrencies: '',
							lastPaymentStatusNotified: '',
							invoice: ''
						}
					},
					{ session }
				);
			}
		}
	},
	{
		name: 'Update payments currencySnapshot',
		_id: new ObjectId('6577739b4feec6c5137a2202'),
		run: async (session: ClientSession) => {
			for await (const order of collections.orders.find(
				{ payments: { $exists: true } },
				{ session }
			)) {
				for (const payment of order.payments) {
					if (!payment.currencySnapshot) {
						continue;
					}
					if ('amount' in payment.currencySnapshot.main) {
						payment.currencySnapshot = {
							main: {
								// @ts-expect-error migration stuff
								price: payment.currencySnapshot.main
							},
							priceReference: {
								// @ts-expect-error migration stuff
								price: payment.currencySnapshot.priceReference
							},
							...(payment.currencySnapshot.secondary && {
								secondary: {
									price: payment.currencySnapshot.secondary
								}
							})
						};
					}
				}
				await collections.orders.updateOne(
					{ _id: order._id },
					{
						$set: {
							payments: order.payments
						}
					},
					{ session }
				);
			}
		}
	},
	{
		name: 'Change bankTransfer to bank-transfer',
		_id: new ObjectId('657f7c76602c2bc0ef4acef4'),
		run: async (session: ClientSession) => {
			let count = 10;
			while (count--) {
				const result = await collections.orders.updateMany(
					{
						'payments.method': 'bankTransfer'
					},
					{
						$set: {
							'payments.$.method': 'bank-transfer'
						}
					},
					{ session }
				);

				if (result.modifiedCount === 0) {
					break;
				}
			}
		}
	},
	{
		name: 'Convert VAT rate to array in orders',
		_id: new ObjectId('65bd8fc40914f6a599ede07d'),
		run: async (session: ClientSession) => {
			await collections.orders.updateMany(
				{ 'vat.price.currency': { $type: 'string' } },
				[
					{
						$set: {
							vat: ['$vat'],
							items: {
								$map: {
									input: '$items',
									as: 'item',
									in: {
										$mergeObjects: [
											'$$item',
											{
												vatRate: '$vat.rate'
											}
										]
									}
								}
							}
						}
					}
				],
				{ session }
			);
			await collections.orders.updateMany(
				{ 'currencySnapshot.main.vat.currency': { $type: 'string' } },
				[
					{
						$set: {
							'currencySnapshot.main.vat': ['$currencySnapshot.main.vat']
						}
					}
				],
				{ session }
			);
			await collections.orders.updateMany(
				{ 'currencySnapshot.priceReference.vat.currency': { $type: 'string' } },
				[
					{
						$set: {
							'currencySnapshot.priceReference.vat': ['$currencySnapshot.priceReference.vat']
						}
					}
				],
				{ session }
			);
			await collections.orders.updateMany(
				{ 'currencySnapshot.secondary.vat.currency': { $type: 'string' } },
				[
					{
						$set: {
							'currencySnapshot.secondary.vat': ['$currencySnapshot.secondary.vat']
						}
					}
				],
				{ session }
			);
		}
	},
	{
		name: 'Add alias to products',
		_id: new ObjectId('657dbb1bd2af2256e82c928c'),
		run: async (session: ClientSession) => {
			await collections.products.updateMany(
				{
					alias: { $exists: false }
				},
				[
					{
						$set: {
							alias: ['$_id']
						}
					}
				],
				{ session }
			);
		}
	},
	{
		name: 'Move basket-top & basket-bottom to cart-top & cart-bottom',
		_id: new ObjectId('65e0861038ba23d6e0eb8c32'),
		run: async (session: ClientSession) => {
			const basketTop = await collections.cmsPages.findOneAndDelete(
				{ _id: 'basket-top' },
				{ session }
			);
			if (basketTop.value) {
				await collections.cmsPages.insertOne(
					{
						...basketTop.value,
						_id: 'cart-top'
					},
					{ session }
				);
			}
			const basketBottom = await collections.cmsPages.findOneAndDelete(
				{ _id: 'basket-bottom' },
				{ session }
			);
			if (basketBottom.value) {
				await collections.cmsPages.insertOne(
					{
						...basketBottom.value,
						_id: 'cart-bottom'
					},
					{ session }
				);
			}
		}
	},
	{
		name: 'Remove user.** wildcard indexes',
		_id: new ObjectId('662a83f6b30d34879b2bbc1f'),
		run: async () => {
			await collections.carts.dropIndex('user.**_1').catch(console.error);
			await collections.paidSubscriptions.dropIndex('user.**_1').catch(console.error);
			await collections.orders.dropIndex('user.**_1').catch(console.error);
			await collections.personalInfo.dropIndex('user.**_1').catch(console.error);
		}
	},
	{
		name: 'Remove productId index',
		_id: new ObjectId('668c423519c3d2f1ba38344e'),
		run: async () => {
			await collections.pictures.dropIndex('productId_1').catch(console.error);
		}
	},
	{
		_id: new ObjectId('669a90d18bc5aaf40c863b63'),
		name: 'Adding actionSettings nostr to products and runtimeConfig',
		run: async (session: ClientSession) => {
			await collections.products.updateMany(
				{},
				{
					$set: {
						'actionSettings.nostr': {
							visible: true,
							canBeAddedToBasket: true
						}
					}
				},
				{ session }
			);
			await collections.runtimeConfig.updateOne(
				{ _id: 'productActionSettings' },
				{
					$set: {
						'data.nostr': {
							visible: true,
							canBeAddedToBasket: true
						}
					}
				},
				{ session }
			);
		}
	},
	{
		_id: new ObjectId('67fd2c1f33909ff6cd56839b'),
		name: 'Replace plausibleScriptUrl with analyticsScriptSnippet',
		run: async (session: ClientSession) => {
			const old = await collections.runtimeConfig.findOne(
				{ _id: 'plausibleScriptUrl' },
				{ session }
			);

			if (!old) {
				return;
			}

			await collections.runtimeConfig.deleteOne({ _id: 'plausibleScriptUrl' }, { session });

			await collections.runtimeConfig.insertOne(
				{
					_id: 'analyticsScriptSnippet',
					data: `<script defer data-domain="${new URL(ORIGIN).hostname}" src="${
						old.data
					}" data-exclude="/admin/*, /admin-*"></script>`,
					updatedAt: old.updatedAt
				},
				{ session }
			);
		}
	},
	{
		_id: new ObjectId('680751f0e6ba7ca6454423d0'),
		name: 'Add mode to existing discounts',
		run: async (session: ClientSession) => {
			await collections.discounts.updateMany(
				{ percentage: { $exists: true }, mode: { $exists: false } },
				{ $set: { mode: 'percentage' } },
				{ session }
			);
		}
	},
	{
		_id: new ObjectId('68230a070000000000000000'),
		name: 'Ensure payment processor is set on lightning payments',
		run: async (session: ClientSession) => {
			await collections.orders.updateMany(
				{ payments: { $elemMatch: { method: 'lightning', processor: { $exists: false } } } },
				{ $set: { 'payments.$.processor': 'lnd' } },
				{ session }
			);
		}
	},
	{
		_id: new ObjectId('68246400cd3efad54fa14bb3'),
		name: 'Replace usersDarkDefaultTheme and employeesDarkDefaultTheme',
		run: async (session: ClientSession) => {
			// MIGRATION 1 — usersDarkDefaultTheme => visitorDarkLightMode
			const oldVisitor = await collections.runtimeConfig.findOne(
				{ _id: 'usersDarkDefaultTheme' },
				{ session }
			);

			await collections.runtimeConfig.updateOne(
				{ _id: 'visitorDarkLightMode' },
				{
					$set: {
						data: oldVisitor && oldVisitor.data === true ? 'dark' : 'light',
						updatedAt: oldVisitor ? oldVisitor.updatedAt : new Date()
					}
				},
				{ upsert: true, session }
			);

			if (oldVisitor) {
				await collections.runtimeConfig.deleteOne({ _id: 'usersDarkDefaultTheme' }, { session });
			}

			// MIGRATION 2 — employeesDarkDefaultTheme => employeeDarkLightMode
			const oldEmployee = await collections.runtimeConfig.findOne(
				{ _id: 'employeesDarkDefaultTheme' },
				{ session }
			);

			await collections.runtimeConfig.updateOne(
				{ _id: 'employeeDarkLightMode' },
				{
					$set: {
						data: oldEmployee && oldEmployee.data === true ? 'dark' : 'light',
						updatedAt: oldEmployee ? oldEmployee.updatedAt : new Date()
					}
				},
				{ upsert: true, session }
			);

			if (oldEmployee) {
				await collections.runtimeConfig.deleteOne(
					{ _id: 'employeesDarkDefaultTheme' },
					{ session }
				);
			}
		}
	},
	{
		_id: new ObjectId('682df8048d5704e22e41212b'),
		name: 'Add hasPosOptions to all user with roleID=point-of-sale',
		run: async (session: ClientSession) => {
			await collections.users.updateMany(
				{ roleId: 'point-of-sale' },
				{ $set: { hasPosOptions: true } },
				{ session }
			);
		}
	},
	{
		_id: new ObjectId('685e7b8042317d9719fb0b7b'),
		name: 'Remove freeQuantity from cart items',
		run: async (session: ClientSession) => {
			await collections.carts.updateMany(
				{},
				{ $unset: { 'items.$[].freeQuantity': 1 } },
				{ session }
			);
		}
	},
	{
		_id: new ObjectId('68e52126bf9841f187344d14'),
		name: 'Create default PoS payment subtype: Cash',
		run: async (session: ClientSession) => {
			const existingCount = await collections.posPaymentSubtypes.countDocuments({}, { session });
			if (existingCount > 0) {
				console.log('PoS payment subtypes already exist, skipping migration');
				return;
			}

			const defaultSubtype: PosPaymentSubtype = {
				_id: new ObjectId(),
				slug: 'cash',
				name: 'Cash',
				description: 'Cash payments',
				sortOrder: 1,
				createdAt: new Date(),
				updatedAt: new Date()
			};

			await collections.posPaymentSubtypes.insertOne(defaultSubtype, { session });

			console.log('Created default PoS payment subtype: Cash');
		}
	},
	{
		_id: new ObjectId('67558e01e92e590e858af9cd'),
		name: 'Create default tag group for existing POS configurations',
		run: async (session: ClientSession) => {
			const existingGroups = await collections.tagGroups.countDocuments({}, { session });
			if (existingGroups > 0) {
				return;
			}

			const config = await collections.runtimeConfig.findOne({ _id: 'posTouchTag' }, { session });
			const posTouchTag = (config?.data as string[]) ?? [];

			if (posTouchTag.length === 0) {
				return;
			}

			await collections.tagGroups.insertOne(
				{
					_id: new ObjectId().toHexString(),
					name: 'All Tags',
					tagIds: posTouchTag,
					order: 0,
					createdAt: new Date(),
					updatedAt: new Date()
				},
				{ session }
			);
		}
	},
	{
		_id: new ObjectId('679145a0e92e590e858af001'),
		name: 'Seed default tag families',
		run: async (session: ClientSession) => {
			const existingCount = await collections.tagFamilies.countDocuments({}, { session });
			if (existingCount > 0) {
				return;
			}

			const defaultFamilies = [
				{ _id: 'creators', name: 'Creators', order: 1 },
				{ _id: 'retailers', name: 'Retailers', order: 2 },
				{ _id: 'events', name: 'Events', order: 3 },
				{ _id: 'temporal', name: 'Temporal', order: 4 }
			];

			await collections.tagFamilies.insertMany(
				defaultFamilies.map((f) => ({
					...f,
					createdAt: new Date(),
					updatedAt: new Date()
				})),
				{ session }
			);
		}
	},
	{
		_id: new ObjectId('6a0f4880e92e590e85af2535'),
		name: 'Round product prices to integer for zero-decimal currencies (issue #2535)',
		run: async (session: ClientSession) => {
			// SAT excluded: crypto unit, already integer.
			const ZERO_DECIMAL_CURRENCIES = CURRENCIES.filter(
				(c) => FRACTION_DIGITS_PER_CURRENCY[c] === 0 && c !== 'SAT'
			);

			await collections.products.updateMany(
				{ 'price.currency': { $in: ZERO_DECIMAL_CURRENCIES } },
				[
					{
						$set: {
							'price.amount': { $round: ['$price.amount', 0] },
							'price.precision': 0
						}
					}
				],
				{ session }
			);
		}
	},
	{
		_id: new ObjectId('660d1e8a2f1e0c0001787001'),
		name: 'Seed default searchlist (issue #1787)',
		run: async (session: ClientSession) => {
			await ensureDefaultSearchlist(session);
		}
	},
	{
		_id: new ObjectId('660d1e8a2f1e0c0001787002'),
		name: 'Backfill displayWidgetName + hideSearchbar on default searchlist (issue #1787)',
		run: async (session: ClientSession) => {
			await collections.searchlists.updateMany(
				{ displayWidgetName: { $exists: false } },
				{ $set: { displayWidgetName: false, updatedAt: new Date() } },
				{ session }
			);
			await collections.searchlists.updateOne(
				{ _id: 'default' },
				{ $set: { hideSearchbar: true, updatedAt: new Date() } },
				{ session }
			);
		}
	},
	{
		_id: new ObjectId('660d1e8a2f1e0c0001787003'),
		name: 'Backfill filters.tags on searchlists (issue #1787)',
		run: async (session: ClientSession) => {
			await collections.searchlists.updateMany(
				{ 'filters.tags': { $exists: false } },
				{
					$set: {
						'filters.tags': { enabled: false, allowedTagIds: [] },
						updatedAt: new Date()
					}
				},
				{ session }
			);
		}
	},
	{
		_id: new ObjectId('660d1e8a2f1e0c0001787004'),
		name: 'Seed search searchlist (issue #1787)',
		run: async (session: ClientSession) => {
			await ensureSearchSearchlist(session);
		}
	},
	{
		_id: new ObjectId('000000000000000000002504'),
		name: 'Backfill public discount price history (issue #2504)',
		run: async (session: ClientSession) => {
			const discounts = await collections.discounts
				.find({ mode: 'percentage' }, { session })
				.toArray();
			for (const discount of discounts) {
				if (!isPublicZeroCriteriaDiscount(discount)) {
					continue;
				}
				// Idempotent: skip discounts already represented in the price calendar.
				const already = await collections.accountingLogs.findOne(
					{ eventType: 'discountPublicPriceChange', objectId: discount._id },
					{ session }
				);
				if (already) {
					continue;
				}
				await collections.accountingLogs.insertOne(
					{
						_id: new ObjectId(),
						eventType: 'discountPublicPriceChange',
						objectType: 'discount',
						objectId: discount._id,
						before: null,
						after: publicDiscountPriceSnapshot(discount),
						createdAt: discount.createdAt ?? new Date()
					},
					{ session }
				);
			}
		}
	},
	{
		_id: new ObjectId('6b1f4880e92e590e85af2388'),
		name: 'Move subscription duration to product level (issue #2388)',
		run: async (session: ClientSession) => {
			const config = await collections.runtimeConfig.findOne(
				{ _id: 'subscriptionDuration' },
				{ session }
			);
			const globalDuration = (config?.data as SubscriptionDuration) ?? 'month';
			await collections.products.updateMany(
				{ type: 'subscription', subscriptionDuration: { $exists: false } },
				{ $set: { subscriptionDuration: globalDuration } },
				{ session }
			);
		}
	}
];

export async function runMigrations() {
	if (env.VITEST) {
		return;
	}
	const lock = await Lock.tryAcquire('migrations');
	if (!lock) {
		return;
	}

	try {
		const migrationsInDb = await collections.migrations.find().toArray();

		if (!migrationsInDb.length) {
			console.log("marking all migrations as done, since there's no record of them in the db");
			await collections.migrations.insertMany(
				migrations.map((migration) => ({
					_id: migration._id,
					name: migration.name,
					createdAt: new Date(),
					updatedAt: new Date()
				}))
			);
			console.log('done');
			return;
		}

		const migrationsToRun = migrations.filter(
			(migration) =>
				!migrationsInDb.find((migrationInDb) => migrationInDb._id.equals(migration._id))
		);

		for (const migration of migrationsToRun) {
			console.log('running migration', migration.name);
			await withTransaction(async (session) => {
				await collections.migrations.insertOne(
					{
						_id: migration._id,
						name: migration.name,
						createdAt: new Date(),
						updatedAt: new Date()
					},
					{ session }
				);
				await migration.run(session);
			});
			console.log('done');
		}
	} finally {
		lock.destroy();
	}

	while ((await collections.migrations.countDocuments()) < migrations.length) {
		await new Promise((resolve) => setTimeout(resolve, 1000));
	}

	// Idempotent on every startup: ensure the built-in searchlists exist.
	// Re-creates them if they were deleted (the admin UI blocks deletion,
	// but a manual Mongo delete still happens).
	await ensureDefaultSearchlist();
	await ensureSearchSearchlist();
}
