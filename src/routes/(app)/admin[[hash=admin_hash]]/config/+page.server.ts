import { ORIGIN } from '$env/static/private';
import { collections } from '$lib/server/database';
import { runtimeConfig } from '$lib/server/runtime-config';
import { CURRENCIES } from '$lib/types/Currency';
import { toCurrency } from '$lib/utils/toCurrency';
import { typedKeys } from '$lib/utils/typedKeys.js';
import { adminPrefix } from '$lib/server/admin';
import { z } from 'zod';
import { redirect } from '@sveltejs/kit';
import { paymentMethods, type PaymentMethod } from '$lib/server/payment-methods.js';

export async function load(event) {
	return {
		ip: event.locals.clientIp,
		isMaintenance: runtimeConfig.isMaintenance,
		maintenanceIps: runtimeConfig.maintenanceIps,
		checkoutButtonOnProductPage: runtimeConfig.checkoutButtonOnProductPage,
		discovery: runtimeConfig.discovery,
		subscriptionDuration: runtimeConfig.subscriptionDuration,
		subscriptionReminderSeconds: runtimeConfig.subscriptionReminderSeconds,
		vatExemptionReason: runtimeConfig.vatExemptionReason,
		desiredPaymentTimeout: runtimeConfig.desiredPaymentTimeout,
		reserveStockInMinutes: runtimeConfig.reserveStockInMinutes,
		allPaymentMethods: paymentMethods({ includeDisabled: true, includePOS: true }),
		disabledPaymentMethods: runtimeConfig.paymentMethods.disabled,
		origin: ORIGIN,
		plausibleScriptUrl: runtimeConfig.plausibleScriptUrl,
		adminHash: runtimeConfig.adminHash,
		collectIPOnDeliverylessOrders: runtimeConfig.collectIPOnDeliverylessOrders,
		isBillingAddressMandatory: runtimeConfig.isBillingAddressMandatory,
		displayNewsletterCommercialProspection: runtimeConfig.displayNewsletterCommercialProspection,
		noProBilling: runtimeConfig.noProBilling,
		cartMaxSeparateItems: runtimeConfig.cartMaxSeparateItems,
		accountingCurrency: runtimeConfig.accountingCurrency,
		copyOrderEmailsToAdmin: runtimeConfig.copyOrderEmailsToAdmin,
		disableLanguageSelector: runtimeConfig.disableLanguageSelector,
		defaultOnLocation: runtimeConfig.defaultOnLocation,
		cartPreviewInteractive: runtimeConfig.cartPreviewInteractive,
		removeBebopLogoPOS: runtimeConfig.removeBebopLogoPOS,
		overwriteCreditCardSvgColor: runtimeConfig.overwriteCreditCardSvgColor,
		hideCreditCardQrCode: runtimeConfig.hideCreditCardQrCode
	};
}

export const actions = {
	update: async function ({ request }) {
		const formData = await request.formData();
		const oldAdminHash = runtimeConfig.adminHash;

		const result = z
			.object({
				isMaintenance: z.boolean({ coerce: true }),
				maintenanceIps: z.string(),
				checkoutButtonOnProductPage: z.boolean({ coerce: true }),
				defaultOnLocation: z.boolean({ coerce: true }),
				noProBilling: z.boolean({ coerce: true }),
				discovery: z.boolean({ coerce: true }),
				copyOrderEmailsToAdmin: z.boolean({ coerce: true }),
				subscriptionDuration: z.enum(['month', 'day', 'hour']),
				mainCurrency: z.enum([CURRENCIES[0], ...CURRENCIES.slice(1).filter((c) => c !== 'SAT')]),
				secondaryCurrency: z
					.enum([CURRENCIES[0], ...CURRENCIES.slice(1).filter((c) => c !== 'SAT'), ''])
					.optional(),
				accountingCurrency: z
					.enum([CURRENCIES[0], ...CURRENCIES.slice(1).filter((c) => c !== 'SAT'), ''])
					.optional(),
				priceReferenceCurrency: z.enum([CURRENCIES[0], ...CURRENCIES.slice(1)]),
				vatExempted: z.boolean({ coerce: true }),
				vatExemptionReason: z.string().default(runtimeConfig.vatExemptionReason),
				vatSingleCountry: z.boolean({ coerce: true }),
				vatNullOutsideSellerCountry: z.boolean({ coerce: true }),
				vatCountry: z.string().default(runtimeConfig.vatCountry),
				subscriptionReminderSeconds: z
					.number({ coerce: true })
					.int()
					.min(0)
					.max(24 * 60 * 60 * 7),
				paymentMethods: z.array(
					z.enum(
						paymentMethods({ includeDisabled: true, includePOS: true }) as [
							PaymentMethod,
							...PaymentMethod[]
						]
					)
				),
				desiredPaymentTimeout: z.number({ coerce: true }).int().min(0),
				reserveStockInMinutes: z.number({ coerce: true }).int().min(0),
				plausibleScriptUrl: z.string(),
				collectIPOnDeliverylessOrders: z.boolean({ coerce: true }),
				adminHash: z.union([z.enum(['']), z.string().regex(/^[a-zA-Z0-9]+$/)]),
				isBillingAddressMandatory: z.boolean({ coerce: true }),
				displayNewsletterCommercialProspection: z.boolean({ coerce: true }),
				cartMaxSeparateItems: z.number({ coerce: true }).int().default(0),
				disableLanguageSelector: z.boolean({ coerce: true }),
				contactModes: z.string().array(),
				contactModesForceOption: z.boolean({ coerce: true }),
				cartPreviewInteractive: z.boolean({ coerce: true }),
				removeBebopLogoPOS: z.boolean({ coerce: true }),
				hideCreditCardQrCode: z.boolean({ coerce: true }),
				overwriteCreditCardSvgColor: z.boolean({ coerce: true })
			})
			.parse({
				...Object.fromEntries(formData),
				paymentMethods: formData.getAll('paymentMethods'),
				contactModes: formData.getAll('contactModes')
			});

		const { paymentMethods: orderedPaymentMethods, ...runtimeConfigUpdates } = {
			...result,
			secondaryCurrency: result.secondaryCurrency || null,
			accountingCurrency: result.accountingCurrency || null,
			cartMaxSeparateItems: result.cartMaxSeparateItems || null
		};

		for (const key of typedKeys(runtimeConfigUpdates)) {
			if (runtimeConfig[key] !== runtimeConfigUpdates[key]) {
				runtimeConfig[key] = runtimeConfigUpdates[key] as never;
				await collections.runtimeConfig.updateOne(
					{ _id: key },
					{
						$set: { data: runtimeConfigUpdates[key], updatedAt: new Date() },
						$setOnInsert: { createdAt: new Date() }
					},
					{ upsert: true }
				);
			}
		}

		const newPaymentMethods = {
			order: orderedPaymentMethods,
			disabled: paymentMethods({ includeDisabled: true, includePOS: true }).filter(
				(method) => !orderedPaymentMethods.includes(method)
			)
		};

		if (JSON.stringify(runtimeConfig.paymentMethods) !== JSON.stringify(newPaymentMethods)) {
			runtimeConfig.paymentMethods = newPaymentMethods;
			await collections.runtimeConfig.updateOne(
				{ _id: 'paymentMethods' },
				{
					$set: { data: newPaymentMethods, updatedAt: new Date() },
					$setOnInsert: { createdAt: new Date() }
				},
				{ upsert: true }
			);
		}

		if (oldAdminHash !== result.adminHash) {
			throw redirect(303, `${adminPrefix()}/config`);
		}

		// return {
		// 	success: 'Configuration updated.'
		// };
	},
	overwriteCurrency: async function ({ request }) {
		const formData = await request.formData();
		const { priceReferenceCurrency } = z
			.object({
				priceReferenceCurrency: z.enum([CURRENCIES[0], ...CURRENCIES.slice(1)])
			})
			.parse(Object.fromEntries(formData));

		const products = await collections.products.find({}).toArray();
		const currency = priceReferenceCurrency;

		if (runtimeConfig.priceReferenceCurrency !== currency) {
			runtimeConfig.priceReferenceCurrency = currency;
			await collections.runtimeConfig.updateOne(
				{ _id: 'priceReferenceCurrency' },
				{ $set: { data: currency, updatedAt: new Date() } },
				{ upsert: true }
			);
		}

		for (const product of products) {
			const priceAmount = toCurrency(currency, product.price.amount, product.price.currency);

			await collections.products.updateOne(
				{ _id: product._id },
				{
					$set: {
						price: {
							amount: priceAmount,
							currency
						},
						updatedAt: new Date()
					}
				}
			);
		}

		return {
			success: 'Price reference currency updated to ' + currency + ' and all prices recalculated.'
		};
	}
};
