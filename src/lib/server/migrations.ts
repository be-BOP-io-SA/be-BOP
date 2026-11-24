import { ClientSession, ObjectId, type Filter } from 'mongodb';
import { collections, withTransaction } from './database';
import { marked } from 'marked';
import { env } from '$env/dynamic/private';
import type { Order, OrderPayment, Price } from '$lib/types/Order';
import { Lock } from './lock';
import { ORIGIN } from '$lib/server/env-config';
import type { PosPaymentSubtype } from '$lib/types/PosPaymentSubtype';
import { CURRENCIES, FRACTION_DIGITS_PER_CURRENCY, type Currency } from '$lib/types/Currency';
import type { SubscriptionDuration } from '$lib/types/SubscriptionDuration';
import {
	DEFAULT_CMS_PAGES,
	buildDefaultCmsPageFields,
	isUntouchedDefaultCmsPage
} from '$lib/server/defaultCmsPages';
import { isPublicZeroCriteriaDiscount, publicDiscountPriceSnapshot } from './discount';
import { defaultLanguageText } from './i18n-defaults';
import { languages, type LanguageKey } from '$lib/translations';

/** Matches an order whose VAT field is still one object, not yet the list the order now stores. */
function holdsSingleVat(path: string) {
	return { $expr: { $eq: [{ $type: `$${path}` }, 'object'] } };
}

// An upsert rather than find-then-insert: every instance seeds at start-up, and two starting
// together on an empty database would otherwise both insert and one would hit a duplicate key.
export async function ensureDefaultSearchlist(session?: ClientSession): Promise<void> {
	const now = new Date();
	await collections.searchlists.updateOne(
		{ _id: 'default' },
		{
			$setOnInsert: {
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
			}
		},
		{ session, upsert: true }
	);
}

export async function ensureSearchSearchlist(session?: ClientSession): Promise<void> {
	const now = new Date();
	await collections.searchlists.updateOne(
		{ _id: 'search' },
		{
			$setOnInsert: {
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
			}
		},
		{ session, upsert: true }
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
				holdsSingleVat('vat'),
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
				holdsSingleVat('currencySnapshot.main.vat'),
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
				holdsSingleVat('currencySnapshot.priceReference.vat'),
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
				holdsSingleVat('currencySnapshot.secondary.vat'),
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
		_id: new ObjectId('684af38a6fbd314f44a84f88'),
		name: 'Set standalone for products with hasVariations',
		run: async (session: ClientSession) => {
			await collections.products.updateMany(
				{ hasVariations: true, standalone: { $ne: true } },
				{ $set: { standalone: true } },
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

			const language = await defaultLanguage(session);
			const defaultSubtype: PosPaymentSubtype = {
				_id: new ObjectId(),
				slug: 'cash',
				name: defaultLanguageText(language, 'admin.posPayments.defaultCashName'),
				description: defaultLanguageText(language, 'admin.posPayments.defaultCashDescription'),
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
	},
	{
		_id: new ObjectId('6b1f4880e92e590e85af2636'),
		name: 'Backfill stable ids on layout links + re-key link translations (issue #2636)',
		run: async (session: ClientSession) => {
			const LINK_KEYS = ['topbarLinks', 'navbarLinks', 'footerLinks'] as const;
			// Stable ids of the default (baseConfig) links, by position — used to re-key overrides
			// on shops that never customized their main links (no runtimeConfig doc to read ids from).
			const DEFAULT_IDS: Record<(typeof LINK_KEYS)[number], string[]> = {
				topbarLinks: ['session', 'search'],
				navbarLinks: ['home', 'catalog'],
				footerLinks: ['terms', 'privacy']
			};
			type Link = { id?: string; label: string; href: string };

			// 1. Backfill an id on every customized main link (docs the operator saved via
			//    /admin/layout). Un-customized shops keep baseConfig defaults, which already ship
			//    stable ids, so there is no DB doc to touch.
			const mainIdsByKey: Record<string, string[]> = {};
			for (const key of LINK_KEYS) {
				const doc = await collections.runtimeConfig.findOne({ _id: key }, { session });
				if (doc && Array.isArray(doc.data)) {
					const links = (doc.data as Link[]).map((l) => ({
						id: l.id || crypto.randomUUID(),
						label: l.label,
						href: l.href
					}));
					await collections.runtimeConfig.updateOne(
						{ _id: key },
						{ $set: { data: links, updatedAt: new Date() } },
						{ session }
					);
					mainIdsByKey[key] = links.map((l) => l.id);
				} else {
					mainIdsByKey[key] = DEFAULT_IDS[key];
				}
			}

			// 2. Re-key each locale's link overrides from array position to the main link id. The
			//    stored overrides were positionally aligned with the main config, so position i maps
			//    to mainIdsByKey[key][i]; entries beyond the main config (or fully empty) are dropped.
			const configDocs = await collections.runtimeConfig.find({}, { session }).toArray();
			for (const doc of configDocs) {
				const docId = doc._id as string;
				if (
					typeof docId !== 'string' ||
					!docId.startsWith('translations.') ||
					!docId.endsWith('.config')
				) {
					continue;
				}
				const data = doc.data as Record<string, unknown> | null;
				if (!data) {
					continue;
				}
				let changed = false;
				for (const key of LINK_KEYS) {
					const arr = data[key];
					if (Array.isArray(arr) && arr.some((e) => e && typeof e === 'object' && !('id' in e))) {
						const mainIds = mainIdsByKey[key] ?? [];
						data[key] = (arr as Link[])
							.map((t, i) =>
								mainIds[i] ? { id: mainIds[i], label: t.label ?? '', href: t.href ?? '' } : null
							)
							.filter((x): x is { id: string; label: string; href: string } =>
								Boolean(x && (x.label || x.href))
							);
						changed = true;
					}
				}
				if (changed) {
					await collections.runtimeConfig.updateOne(
						{ _id: doc._id },
						{ $set: { data, updatedAt: new Date() } },
						{ session }
					);
				}
			}
		}
	},
	{
		_id: new ObjectId('6b1f4880e92e590e85af2492'),
		name: 'Drop single-currency (SAT) amount from order.vat; amounts live in currencySnapshot (issue #2492)',
		run: async (session: ClientSession) => {
			// Old orders stored order.vat[].price/partialPrice in the internal SAT unit. The correct
			// per-currency amounts are already frozen in currencySnapshot.*.vat, so we only need to
			// reduce each entry to its {rate, country} breakdown — no rate lookup required.
			const cursor = collections.orders.find({ 'vat.price': { $exists: true } } as Filter<Order>, {
				projection: { vat: 1 },
				session
			});
			for await (const order of cursor) {
				const vat = (order.vat ?? []).map(({ rate, country }) => ({ rate, country }));
				await collections.orders.updateOne({ _id: order._id }, { $set: { vat } }, { session });
			}
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
		_id: new ObjectId('6b1f4880e92e590e85af0878'),
		name: 'Backfill translations on untouched default CMS pages (issue #878)',
		run: async (session: ClientSession) => {
			const pages = await collections.cmsPages
				.find(
					{ _id: { $in: [...DEFAULT_CMS_PAGES] } },
					{ projection: { _id: 1, title: 1, content: 1, translations: 1 }, session }
				)
				.toArray();

			for (const page of pages) {
				const slug = page._id as (typeof DEFAULT_CMS_PAGES)[number];
				if (
					!isUntouchedDefaultCmsPage(slug, page) ||
					(page.translations && Object.keys(page.translations).length > 0)
				) {
					continue;
				}
				const { translations } = buildDefaultCmsPageFields(slug);
				await collections.cmsPages.updateOne(
					{ _id: slug },
					{ $set: { translations, updatedAt: new Date() } },
					{ session }
				);
			}
		}
	},
	{
		_id: new ObjectId('6b2a91c4e92e590e85af1120'),
		name: 'Translate the untouched default PoS cash subtype (issue #878)',
		run: async (session: ClientSession) => {
			const language = await defaultLanguage(session);
			const name = defaultLanguageText(language, 'admin.posPayments.defaultCashName');
			const description = defaultLanguageText(language, 'admin.posPayments.defaultCashDescription');
			if (name === 'Cash' && description === 'Cash payments') {
				return;
			}
			// Only the untouched English default is rewritten: a shop that renamed its cash
			// subtype keeps its own wording.
			await collections.posPaymentSubtypes.updateOne(
				{ slug: 'cash', name: 'Cash', description: 'Cash payments' },
				{ $set: { name, description, updatedAt: new Date() } },
				{ session }
			);
		}
	},
	{
		_id: new ObjectId('6b1f4880e92e590e85af2568'),
		name: 'Drop the null booking spec stored on products created without one (issue #2568)',
		run: async (session: ClientSession) => {
			await collections.products.updateMany(
				{ bookingSpec: { $type: 'null' } },
				{ $unset: { bookingSpec: '' } },
				{ session }
			);
		}
	},
	{
		_id: new ObjectId('000000000000000000002899'),
		name: 'Attest the SSO e-mails the large providers released, on sessions predating the flag',
		run: async (session: ClientSession) => {
			// An SSO address only identifies a customer once the provider attests it. Sessions
			// written before that flag existed carry none, so their address stops matching orders
			// it used to match — for up to a year, until the customer signs in again.
			//
			// These four release only an address they own, which is why `hooks.server.ts` marks
			// their new sessions verified outright; this backfills the ones already stored.
			// Entries from an operator-configured OIDC server are deliberately left alone: be-BOP
			// cannot know whether that server checks addresses, which is the whole point of the
			// flag. They are told apart by their id shape — Auth.js prefixes it with the provider
			// name, an OIDC `sub` is arbitrary — so naming an OIDC slug after a provider is not
			// enough to be trusted here.
			const AUTHJS_PROVIDERS = ['github', 'google', 'facebook', 'twitter'];

			await collections.sessions.updateMany(
				{
					sso: {
						$elemMatch: {
							provider: { $in: AUTHJS_PROVIDERS },
							emailVerified: { $exists: false }
						}
					}
				},
				{ $set: { 'sso.$[entry].emailVerified': true } },
				{
					session,
					arrayFilters: [
						{
							'entry.emailVerified': { $exists: false },
							$or: AUTHJS_PROVIDERS.map((provider) => ({
								'entry.provider': provider,
								'entry.id': { $regex: `^${provider}-` }
							}))
						}
					]
				}
			);
		}
	},
	{
		_id: new ObjectId('6b05e1289d7ea34515b6ec08'),
		name: 'Reconstruct items.vatRate from the recorded VAT amounts, unwrap order.vat and currencySnapshot vat lists damaged by the VAT-to-array migration, and label the orders that cannot be reconstructed',
		run: async (session: ClientSession) => {
			const damaged = [
				{ 'items.vatRate': { $type: 'array' } },
				{ 'vat.0': { $type: 'array' } },
				...VAT_SNAPSHOTS.map((key) => ({ [`currencySnapshot.${key}.vat.0`]: { $type: 'array' } }))
			];
			let labelReady = false;
			for await (const order of collections.orders.find({ $or: damaged }, { session })) {
				// Already listed and labelled: a rerun has nothing to say about it again.
				if (order.orderLabelIds?.includes(VAT_REPAIR_LABEL._id)) {
					continue;
				}
				const set: Record<string, unknown> = {};
				const lines = unwrapVatList(order.vat ?? []);
				const recorded: RecordedVat = {};
				for (const key of VAT_SNAPSHOTS) {
					const amounts = order.currencySnapshot?.[key]?.vat;
					if (amounts) {
						recorded[key] = unwrapVatList(amounts);
						if (recorded[key] !== amounts) {
							set[`currencySnapshot.${key}.vat`] = recorded[key];
						}
					}
				}
				const wrappedVat = !!order.vat && lines !== order.vat;
				if (wrappedVat) {
					// Same reduction as the migration dropping the SAT amounts, which skipped these lists.
					set.vat = lines.map(({ rate, country }) => ({ rate, country }));
				}

				// An order with its own item rates, hit through a snapshot only, has nothing to rebuild.
				let notReconstructed: string | undefined;
				if (wrappedVat || order.items.some((item) => Array.isArray(item.vatRate))) {
					const result = reconstructItemRates(order.items, order.currencySnapshot, lines, recorded);
					if ('rates' in result) {
						set.items = order.items.map((item, i) => ({ ...item, vatRate: result.rates[i] }));
					} else {
						notReconstructed = result.reason;
					}
				}

				if (notReconstructed) {
					warnVatRepair(order, notReconstructed);
					if (!labelReady) {
						await ensureVatRepairLabel(session);
						labelReady = true;
					}
				}
				const update = {
					...(Object.keys(set).length && { $set: set }),
					...(notReconstructed && { $addToSet: { orderLabelIds: VAT_REPAIR_LABEL._id } })
				};
				if (Object.keys(update).length) {
					await collections.orders.updateOne({ _id: order._id }, update, { session });
				}
			}
		}
	}
];

const VAT_SNAPSHOTS = ['main', 'priceReference', 'secondary'] as const;

type RecordedVat = Partial<Record<(typeof VAT_SNAPSHOTS)[number], Price[]>>;

/** Shown in the admin order list and filterable there; the id is fixed so a rerun never adds a second one. */
const VAT_REPAIR_LABEL = { _id: 'vat-rate-to-check', color: '#ea580c', icon: '🧾' };
const VAT_REPAIR_LABEL_NAME_KEY = 'admin.label.vatRateToCheck';

/** The label exists only once an order needs it, and a label the shop already holds under that id is kept. */
async function ensureVatRepairLabel(session: ClientSession) {
	const now = new Date();
	await collections.labels.updateOne(
		{ _id: VAT_REPAIR_LABEL._id },
		{
			$setOnInsert: {
				name: defaultLanguageText(await defaultLanguage(session), VAT_REPAIR_LABEL_NAME_KEY),
				color: VAT_REPAIR_LABEL.color,
				icon: VAT_REPAIR_LABEL.icon,
				translations: Object.fromEntries(
					(Object.keys(languages) as LanguageKey[]).map((language) => [
						language,
						{ name: defaultLanguageText(language, VAT_REPAIR_LABEL_NAME_KEY) }
					])
				),
				createdAt: now,
				updatedAt: now
			}
		},
		{ upsert: true, session }
	);
}

/** Names an order by its number only: its id opens the order page. */
function warnVatRepair(order: { number: number }, reason: string) {
	console.warn(
		`Order number ${order.number}: item VAT rates could not be reconstructed (${reason})`
	);
}

/** A list wrapped in a second one gets back to one level; any other list is returned as is. */
function unwrapVatList<T>(list: T[]): T[] {
	const [first] = list;
	return list.length === 1 && Array.isArray(first) ? (first as T[]) : list;
}

/** The smallest amount a price is stored with, which rounds item prices before they are summed. */
function storageUnit(currency: Currency) {
	return currency === 'SAT' ? 1 : 1e-8;
}

/** Half a satoshi, the rounding of amounts summed in the internal unit, in a currency; 0 for fiat. */
function satUnitIn(currency: Currency) {
	return currency === 'SAT' ? 1 : currency === 'BTC' ? 1e-8 : 0;
}

/** How many assignments of rates to item groups are tried, at most. */
const MAX_VAT_ASSIGNMENTS = 50_000;

/**
 * The rate of each item, when the VAT amounts recorded per rate leave one possible answer.
 *
 * Items sharing a VAT profile and a shipping flag share a rate, which is one of the order's VAT
 * lines, or 0 for an item exempt at customs. An assignment is kept when the amounts it gives per
 * line (items plus the delivery fee, whose rate and tax mode are not recorded) match the recorded
 * amounts of every currency, within what rounding can move them. Nothing is guessed: with no
 * assignment or several, no rate is returned. Only the order's own data is read, never a VAT
 * profile or a rate table that may have changed since.
 */
function reconstructItemRates(
	items: Order['items'],
	currencySnapshot: Order['currencySnapshot'] | undefined,
	lines: Array<{ rate: unknown }>,
	recorded: RecordedVat
): { rates: number[] } | { reason: string } {
	const rates = lines.map((line) => line.rate);
	if (!rates.length || rates.some((rate) => typeof rate !== 'number')) {
		return { reason: 'the order has no VAT line with a rate' };
	}
	const lineRates = rates as number[];
	if (new Set(lineRates).size !== lineRates.length) {
		return { reason: 'two VAT lines share a rate' };
	}
	const keys = VAT_SNAPSHOTS.filter((key) => recorded[key]?.length);
	if (!keys.length || keys.some((key) => recorded[key]?.length !== lineRates.length)) {
		return { reason: 'the recorded VAT amounts are missing or do not match the VAT lines' };
	}
	if (items.some((item) => item.booking)) {
		return { reason: 'the order has a booking item' };
	}

	if (!items.length) {
		return { reason: 'the order has no item' };
	}
	const currencies = keys.map((key) => recorded[key]?.[0]?.currency as Currency);
	if (currencies.some((currency) => !(currency in FRACTION_DIGITS_PER_CURRENCY))) {
		return { reason: 'the VAT amounts are in an unknown currency' };
	}

	// What rounding can move a recorded amount by, per currency: one unit of it, plus, for every
	// item, half a unit of the currency the item is priced in (its VAT was rounded alone before
	// the cart summed it unrounded, and the sum is rounded once more), converted into that currency
	// through the item's own recorded prices.
	const maxRate = Math.max(...lineRates);
	const tolerance = currencies.map((currency) =>
		Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY[currency])
	);
	const lineRounding = keys.map(() => 0);

	const groups: Array<{
		itemIndexes: number[];
		bases: number[];
		ships: boolean;
		mayBeExempt: boolean;
	}> = [];
	const groupOf = new Map<string, number>();
	for (const [i, item] of items.entries()) {
		const source = item.customPrice ?? item.product?.price;
		const bases = keys.map((key, k) => {
			const snapshot = item.currencySnapshot?.[key];
			const price = snapshot?.customPrice ?? snapshot?.price;
			if (!price || typeof price.amount !== 'number' || price.currency !== currencies[k]) {
				return undefined;
			}
			const billed =
				Math.max(item.quantity - (item.freeQuantity ?? 0), 0) *
				(1 - (item.discountPercentage ?? 0) / 100);
			if (price.amount * billed > 0) {
				if (!source || !(source.amount > 0) || !(source.currency in FRACTION_DIGITS_PER_CURRENCY)) {
					return undefined;
				}
				const halfSourceUnit = 0.5 * Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY[source.currency]);
				const inCurrency = (halfSourceUnit * price.amount) / source.amount;
				tolerance[k] +=
					inCurrency +
					0.5 * storageUnit(currencies[k]) * billed * (maxRate / 100) +
					0.5 * satUnitIn(currencies[k]);
				lineRounding[k] = Math.max(lineRounding[k], inCurrency);
			}
			return price.amount * billed;
		});
		if (bases.some((base) => base === undefined)) {
			return { reason: 'an item has no recorded price in the currency of the VAT amounts' };
		}
		const groupKey = `${item.product?.vatProfileId ?? ''}|${item.product?.shipping}`;
		let group = groupOf.get(groupKey);
		if (group === undefined) {
			group = groups.length;
			groupOf.set(groupKey, group);
			groups.push({
				itemIndexes: [],
				bases: keys.map(() => 0),
				ships: item.product?.shipping === true,
				mayBeExempt: item.product?.shipping !== false
			});
		}
		groups[group].itemIndexes.push(i);
		for (const [k, base] of bases.entries()) {
			groups[group].bases[k] += base as number;
		}
	}

	const deliveryFees = keys.map((key) => currencySnapshot?.[key]?.shippingPrice);
	if (deliveryFees.some((fee, k) => fee && fee.currency !== currencies[k])) {
		return { reason: 'the delivery fee is not in the currency of the VAT amounts' };
	}
	const feeAmounts = deliveryFees.map((fee) => fee?.amount ?? 0);
	// The delivery fee is priced in the main currency, and its VAT is rounded in it as items' is.
	const mainFee = currencySnapshot?.main?.shippingPrice;
	const mainFeeUnit =
		mainFee && mainFee.currency in FRACTION_DIGITS_PER_CURRENCY
			? Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY[mainFee.currency])
			: 0;
	for (const [k, fee] of feeAmounts.entries()) {
		if (fee > 0) {
			tolerance[k] +=
				0.5 * mainFeeUnit * (mainFee && mainFee.amount > 0 ? fee / mainFee.amount : 1);
		}
		// The sum of the lines is rounded once as well, and the margin covers float noise.
		tolerance[k] += lineRounding[k] + 1e-9;
	}

	const options = groups.map((group) => [
		...lineRates,
		...(group.mayBeExempt && !lineRates.includes(0) ? [0] : [])
	]);
	const combinations = options.reduce((count, rates) => count * rates.length, 1);
	if (combinations > MAX_VAT_ASSIGNMENTS) {
		return { reason: 'too many item groups to try every assignment' };
	}

	const fitting = new Set<string>();
	const assignment: number[] = [];
	const fits = (): boolean => {
		const exempt = groups.map((_, g) => assignment[g] === 0 && !lineRates.includes(0));
		// At customs every shipping item is exempt and so is the delivery fee, which then has no VAT.
		if (exempt.some(Boolean) && groups.some((group, g) => group.ships && !exempt[g])) {
			return false;
		}
		// The delivery fee's own rate and whether its price includes VAT are not recorded: try each,
		// and a fee without VAT (a rate of 0 leaves no line).
		const deliveries =
			!feeAmounts.some((fee) => fee > 0) || exempt.some(Boolean)
				? [undefined]
				: [
						undefined,
						...lineRates.flatMap((rate) => [
							{ rate, included: false },
							{ rate, included: true }
						])
				  ];
		return deliveries.some((delivery) =>
			keys.every((key, k) =>
				lineRates.every((rate, j) => {
					const itemsAtRate = groups.reduce(
						(total, group, g) => total + (assignment[g] === rate ? group.bases[k] : 0),
						0
					);
					const fee =
						delivery?.rate === rate
							? delivery.included
								? feeAmounts[k] / (1 + rate / 100)
								: feeAmounts[k]
							: 0;
					const amount = recorded[key]?.[j]?.amount;
					return (
						typeof amount === 'number' &&
						Math.abs(((itemsAtRate + fee) * rate) / 100 - amount) <= tolerance[k]
					);
				})
			)
		);
	};
	const search = (g: number) => {
		if (g === groups.length) {
			if (fits()) {
				fitting.add(assignment.join(','));
			}
			return;
		}
		for (const rate of options[g]) {
			assignment[g] = rate;
			search(g + 1);
		}
	};
	search(0);

	if (fitting.size === 0) {
		return { reason: 'no assignment of rates fits the recorded VAT amounts' };
	}
	if (fitting.size > 1) {
		return { reason: 'several assignments of rates fit the recorded VAT amounts' };
	}
	const [chosen] = [...fitting].map((key) => key.split(',').map(Number));
	// A group with a single possible rate is not told by the amounts but by the list of lines, which
	// lacks any rate whose VAT rounded to nothing: its own VAT has to be large enough to be seen.
	for (const [g, group] of groups.entries()) {
		if (
			options[g].length === 1 &&
			group.bases.some((base, k) => (base * chosen[g]) / 100 <= tolerance[k])
		) {
			return { reason: 'an item group has too small a VAT amount to tell its rate by' };
		}
	}
	const result: number[] = [];
	for (const [g, group] of groups.entries()) {
		for (const i of group.itemIndexes) {
			result[i] = chosen[g];
		}
	}
	return { rates: result };
}

/**
 * Migrations cannot import runtimeConfig: runtime-config.ts imports runMigrations, which
 * would make the cycle. Read the shop language straight from its collection instead.
 */
async function defaultLanguage(session: ClientSession): Promise<LanguageKey> {
	const doc = await collections.runtimeConfig.findOne({ _id: 'defaultLanguage' }, { session });
	const value = doc?.data;
	return typeof value === 'string' && value in languages ? (value as LanguageKey) : 'en';
}

export async function runMigrations() {
	if (env.VITEST) {
		return;
	}

	/**
	 * Before the lock, and before both early returns below.
	 *
	 * A brand-new shop records every migration as done and returns; an instance that loses the lock
	 * returns too. Seeding at the end of this function made it conditional on a path a first start
	 * never takes, so a shop pointed at an empty database and started once had no searchlist at all,
	 * and only a restart gave it one.
	 *
	 * Safe here: both are idempotent and depend on no migration. They also re-create a list somebody
	 * removed straight from Mongo — the admin refuses to delete them, a shell does not.
	 */
	await ensureDefaultSearchlist();
	await ensureSearchSearchlist();

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

	/**
	 * Only the lock holder gets here, and it has just written those records itself: a count that
	 * never catches up means one was lost, not that another instance is still working. Waiting for
	 * ever on it kept the mismatch silent while the instance served traffic.
	 */
	const waitUntil = Date.now() + 60_000;
	for (;;) {
		const recorded = await collections.migrations.countDocuments();
		if (recorded >= migrations.length) {
			break;
		}
		if (Date.now() > waitUntil) {
			console.error(
				`migrations: ${recorded} recorded for ${migrations.length} known, still short after 60s — carrying on`
			);
			break;
		}
		await new Promise((resolve) => setTimeout(resolve, 1000));
	}
}
