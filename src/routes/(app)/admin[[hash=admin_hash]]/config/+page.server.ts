import { ORIGIN } from '$lib/server/env-config';
import { collections } from '$lib/server/database';
import { runtimeConfig } from '$lib/server/runtime-config';
import { CURRENCIES } from '$lib/types/Currency';
import { SUBSCRIPTION_DURATIONS } from '$lib/types/SubscriptionDuration';
import { toCurrency } from '$lib/utils/toCurrency';
import { typedKeys } from '$lib/utils/typedKeys.js';
import { adminPrefix } from '$lib/server/admin';
import { z } from 'zod';
import { redirect } from '@sveltejs/kit';
import {
	paymentMethods,
	type PaymentMethod,
	type PaymentProcessor
} from '$lib/server/payment-methods.js';
import { isSumupEnabled } from '$lib/server/sumup';
import { isStripeEnabled } from '$lib/server/stripe';
import { isBitcoinConfigured as isBitcoindConfigured } from '$lib/server/bitcoind';
import { isBitcoinNodelessConfigured } from '$lib/server/bitcoin-nodeless';
import { isLndConfigured } from '$lib/server/lnd';
import { isPhoenixdConfigured } from '$lib/server/phoenixd';
import { isSwissBitcoinPayConfigured } from '$lib/server/swiss-bitcoin-pay';
import { isBtcpayServerConfigured } from '$lib/server/btcpay-server';

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
		analyticsScriptSnippet: runtimeConfig.analyticsScriptSnippet,
		adminHash: runtimeConfig.adminHash,
		adminPrefix: adminPrefix(),
		collectIPOnDeliverylessOrders: runtimeConfig.collectIPOnDeliverylessOrders,
		isBillingAddressMandatory: runtimeConfig.isBillingAddressMandatory,
		displayNewsletterCommercialProspection: runtimeConfig.displayNewsletterCommercialProspection,
		noProBilling: runtimeConfig.noProBilling,
		cartMaxSeparateItems: runtimeConfig.cartMaxSeparateItems,
		physicalCartMinAmount: runtimeConfig.physicalCartMinAmount,
		accountingCurrency: runtimeConfig.accountingCurrency,
		copyOrderEmailsToAdmin: runtimeConfig.copyOrderEmailsToAdmin,
		disableLanguageSelector: runtimeConfig.disableLanguageSelector,
		defaultOnLocation: runtimeConfig.defaultOnLocation,
		cartPreviewInteractive: runtimeConfig.cartPreviewInteractive,
		removeBebopLogoPOS: runtimeConfig.removeBebopLogoPOS,
		overwriteCreditCardSvgColor: runtimeConfig.overwriteCreditCardSvgColor,
		hideShopBankOnReceipt: runtimeConfig.hideShopBankOnReceipt,
		hideShopBankOnTicket: runtimeConfig.hideShopBankOnTicket,
		hideCreditCardQrCode: runtimeConfig.hideCreditCardQrCode,
		hideCartInToolbar: runtimeConfig.hideCartInToolbar,
		removePopinProductPrice: runtimeConfig.removePopinProductPrice,
		// Payment processor preferences
		preferredProcessorCard: runtimeConfig.paymentProcessorPreferences?.card ?? '',
		preferredProcessorBitcoin: runtimeConfig.paymentProcessorPreferences?.bitcoin ?? '',
		preferredProcessorLightning: runtimeConfig.paymentProcessorPreferences?.lightning ?? '',
		// Processor availability flags
		sumUpConfigured: isSumupEnabled(),
		stripeConfigured: isStripeEnabled(),
		bitcoindConfigured: isBitcoindConfigured,
		bitcoinNodelessConfigured: isBitcoinNodelessConfigured(),
		lndConfigured: isLndConfigured(),
		phoenixdConfigured: isPhoenixdConfigured(),
		swissBitcoinPayConfigured: isSwissBitcoinPayConfigured(),
		btcpayServerConfigured: isBtcpayServerConfigured()
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
				hideShopBankOnReceipt: z.boolean({ coerce: true }),
				hideShopBankOnTicket: z.boolean({ coerce: true }),
				subscriptionDuration: z.enum(SUBSCRIPTION_DURATIONS),
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
				displayVatIncludedInProduct: z.boolean({ coerce: true }),
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
				analyticsScriptSnippet: z.string(),
				collectIPOnDeliverylessOrders: z.boolean({ coerce: true }),
				adminHash: z.union([z.enum(['']), z.string().regex(/^[a-zA-Z0-9]+$/)]),
				isBillingAddressMandatory: z.boolean({ coerce: true }),
				displayNewsletterCommercialProspection: z.boolean({ coerce: true }),
				cartMaxSeparateItems: z.number({ coerce: true }).int().default(0),
				physicalCartMinAmount: z.number({ coerce: true }).int().default(0),
				disableLanguageSelector: z.boolean({ coerce: true }),
				hideCartInToolbar: z.boolean({ coerce: true }),
				contactModes: z.string().array(),
				contactModesForceOption: z.boolean({ coerce: true }),
				cartPreviewInteractive: z.boolean({ coerce: true }),
				removeBebopLogoPOS: z.boolean({ coerce: true }),
				hideCreditCardQrCode: z.boolean({ coerce: true }),
				overwriteCreditCardSvgColor: z.boolean({ coerce: true }),
				removePopinProductPrice: z.boolean({ coerce: true }),
				preferredProcessorCard: z.enum(['sumup', 'stripe', '']).optional(),
				preferredProcessorBitcoin: z.enum(['bitcoind', 'bitcoin-nodeless', '']).optional(),
				preferredProcessorLightning: z
					.enum(['lnd', 'phoenixd', 'swiss-bitcoin-pay', 'btcpay-server', ''])
					.optional()
			})
			.parse({
				...Object.fromEntries(formData),
				paymentMethods: formData.getAll('paymentMethods'),
				contactModes: formData.getAll('contactModes')
			});

		const {
			paymentMethods: orderedPaymentMethods,
			preferredProcessorCard,
			preferredProcessorBitcoin,
			preferredProcessorLightning,
			...runtimeConfigUpdates
		} = {
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

		// Save processor preferences
		const preferences: Partial<Record<PaymentMethod, PaymentProcessor>> = {
			...(preferredProcessorCard && {
				card: preferredProcessorCard
			}),
			...(preferredProcessorBitcoin && {
				bitcoin: preferredProcessorBitcoin
			}),
			...(preferredProcessorLightning && {
				lightning: preferredProcessorLightning
			})
		};

		if (JSON.stringify(runtimeConfig.paymentProcessorPreferences) !== JSON.stringify(preferences)) {
			runtimeConfig.paymentProcessorPreferences = preferences;
			await collections.runtimeConfig.updateOne(
				{ _id: 'paymentProcessorPreferences' },
				{
					$set: { data: preferences, updatedAt: new Date() },
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
