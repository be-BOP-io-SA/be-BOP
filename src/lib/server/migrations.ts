import { ClientSession, ObjectId } from 'mongodb';
import { collections, withTransaction } from './database';
import { marked } from 'marked';
import { env } from '$env/dynamic/private';
import type { OrderPayment } from '$lib/types/Order';
import { Lock } from './lock';
import { ORIGIN } from '$env/static/private';
import { SUPER_ADMIN_ROLE_ID } from '$lib/types/User';
import type { Tutorial } from '$lib/types/Tutorial';

const migrations = [
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
		_id: new ObjectId('678a1b2c3d4e5f6a7b8c9d0e'),
		name: 'Add default onboarding tutorial',
		run: async (session: ClientSession) => {
			const existingTutorial = await collections.tutorials.findOne(
				{ _id: 'onboarding' },
				{ session }
			);

			if (existingTutorial) {
				return;
			}

			const onboardingTutorial: Tutorial = {
				_id: 'onboarding',
				name: 'Super Admin Onboarding',
				description: 'Initial setup guide for new be-BOP installations',
				version: 1,
				targetRoles: [SUPER_ADMIN_ROLE_ID],
				isActive: true,
				triggerType: 'first-login',
				estimatedTimeMinutes: 10,
				steps: [
					{
						id: 'arm-recovery',
						order: 1,
						route: '/admin/arm',
						attachTo: { element: 'input[name="recoveryNpub"]', on: 'bottom' },
						titleKey: 'tutorial.onboarding.step1.title',
						textKey: 'tutorial.onboarding.step1.text',
						requiredAction: {
							type: 'form-submit',
							selector: 'form',
							validation: 'non-empty'
						}
					},
					{
						id: 'nostr-nsec',
						order: 2,
						route: '/admin/arm',
						attachTo: { element: 'button[data-generate-nsec]', on: 'bottom' },
						titleKey: 'tutorial.onboarding.step2.title',
						textKey: 'tutorial.onboarding.step2.text',
						requiredAction: {
							type: 'click',
							selector: 'button[data-generate-nsec]'
						}
					},
					{
						id: 'admin-hash',
						order: 3,
						route: '/admin/config',
						attachTo: { element: 'input[name="adminHash"]', on: 'bottom' },
						titleKey: 'tutorial.onboarding.step3.title',
						textKey: 'tutorial.onboarding.step3.text',
						requiredAction: {
							type: 'input',
							selector: 'input[name="adminHash"]',
							validation: 'non-empty'
						}
					},
					{
						id: 'identity-setup',
						order: 4,
						route: '/admin/identity',
						attachTo: { element: 'input[name="brandName"]', on: 'bottom' },
						titleKey: 'tutorial.onboarding.step4.title',
						textKey: 'tutorial.onboarding.step4.text',
						requiredAction: {
							type: 'form-submit',
							selector: 'form'
						}
					}
				],
				createdAt: new Date(),
				updatedAt: new Date()
			};

			await collections.tutorials.insertOne(onboardingTutorial, { session });
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
}
