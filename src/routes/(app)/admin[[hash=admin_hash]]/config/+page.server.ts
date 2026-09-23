import { ORDER_PAYMENT_STATUSES, type OrderPaymentStatus } from '$lib/types/Order';
import { DELAY_MULTIPLIERS } from '$lib/utils/delayMultipliers';
import { ORIGIN } from '$lib/server/env-config';
import { collections } from '$lib/server/database';
import { runtimeConfig } from '$lib/server/runtime-config';
import { CURRENCIES } from '$lib/types/Currency';
import { toCurrency } from '$lib/utils/toCurrency';
import { typedKeys } from '$lib/utils/typedKeys.js';
import { fetchAndSaveExchangeRates } from '$lib/server/locks/currency-lock';
import { adminPrefix } from '$lib/server/admin';
import { persistConfigElement } from '$lib/server/utils/persistConfig';
import { z } from 'zod';
import { error, redirect } from '@sveltejs/kit';
import {
	paymentMethods,
	type PaymentMethod,
	type PaymentProcessor
} from '$lib/server/payment-methods.js';
import { getProcessor, getProcessorsForMethod } from '$lib/server/sdk/pp';
import { PROCESSORS } from '$lib/types/paymentProcessors';
import { logAccountingEvent, employeeFromLocals } from '$lib/server/accounting-log';
import { SUBSCRIPTION_DURATIONS } from '$lib/types/SubscriptionDuration';

/** The methods a shop can express a processor preference for: the ones several providers serve. */
const PROCESSOR_CHOICE_METHODS = ['card', 'bitcoin', 'lightning'] as const;

/**
 * Accepts the empty string (no preference) or a processor that serves this method. Asked of
 * the registry rather than listed, so adding a provider needs no edit here.
 */
const preferenceFor = (method: PaymentMethod) =>
	z
		.string()
		.refine(
			(slug) => slug === '' || getProcessor(slug)?.meta.method === method,
			`Not a ${method} processor`
		)
		// The refine above has already established this; the cast only tells the compiler so.
		.transform((slug) => slug as PaymentProcessor | '')
		.optional();

const VAT_SETTING_KEYS = new Set([
	'vatExempted',
	'vatCountry',
	'vatSingleCountry',
	'vatNullOutsideSellerCountry',
	'displayVatIncludedInProduct',
	'vatExemptionReason'
]);

export async function load(event) {
	return {
		ip: event.locals.clientIp,
		isMaintenance: runtimeConfig.isMaintenance,
		maintenanceIps: runtimeConfig.maintenanceIps,
		checkoutButtonOnProductPage: runtimeConfig.checkoutButtonOnProductPage,
		priceHistoryEnabled: runtimeConfig.priceHistoryEnabled,
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
		allowCartFromUrl: runtimeConfig.allowCartFromUrl,
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
		// Who serves each method, in the order a shop without a preference falls back through.
		// The page used to keep its own copy of this, and a ninth import every time a processor
		// was added; the registry has known it all along.
		processorsByMethod: Object.fromEntries(
			PROCESSOR_CHOICE_METHODS.map((method) => [
				method,
				getProcessorsForMethod(method).map((pp) => ({
					slug: pp.meta.processor,
					label: PROCESSORS[pp.meta.processor].label,
					configured: pp.isEnabled(),
					// lnd and bitcoind take their credentials from the environment, so there is no
					// settings page to send the shopowner to.
					hasSettingsPage: 'configKey' in PROCESSORS[pp.meta.processor]
				}))
			])
		),
		dataCleanup: runtimeConfig.dataCleanup
	};
}

export const actions = {
	update: async function ({ request, locals }) {
		const formData = await request.formData();
		const oldAdminHash = runtimeConfig.adminHash;

		const result = z
			.object({
				isMaintenance: z.boolean({ coerce: true }),
				maintenanceIps: z.string(),
				checkoutButtonOnProductPage: z.boolean({ coerce: true }),
				priceHistoryEnabled: z.boolean({ coerce: true }),
				defaultOnLocation: z.boolean({ coerce: true }),
				noProBilling: z.boolean({ coerce: true }),
				discovery: z.boolean({ coerce: true }),
				copyOrderEmailsToAdmin: z.boolean({ coerce: true }),
				hideShopBankOnReceipt: z.boolean({ coerce: true }),
				hideShopBankOnTicket: z.boolean({ coerce: true }),
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
				subscriptionDuration: z.enum(SUBSCRIPTION_DURATIONS),
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
				allowCartFromUrl: z.boolean({ coerce: true }),
				removeBebopLogoPOS: z.boolean({ coerce: true }),
				hideCreditCardQrCode: z.boolean({ coerce: true }),
				overwriteCreditCardSvgColor: z.boolean({ coerce: true }),
				removePopinProductPrice: z.boolean({ coerce: true }),
				// A preference names a processor that actually serves the method. Spelling the
				// slugs out here meant a fourth hand-maintained copy of the method→processor map,
				// and it drifted: this list is the registry's answer instead.
				preferredProcessorCard: preferenceFor('card'),
				preferredProcessorBitcoin: preferenceFor('bitcoin'),
				preferredProcessorLightning: preferenceFor('lightning')
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

		let currencySettingChanged = false;

		for (const key of typedKeys(runtimeConfigUpdates)) {
			if (runtimeConfig[key] !== runtimeConfigUpdates[key]) {
				if (VAT_SETTING_KEYS.has(key)) {
					await logAccountingEvent({
						eventType: 'vatSettingsUpdate',
						before: runtimeConfig[key],
						after: runtimeConfigUpdates[key],
						objectId: key,
						objectType: 'setting',
						...employeeFromLocals(locals)
					});
				}
				if (key === 'mainCurrency' || key === 'secondaryCurrency' || key === 'accountingCurrency') {
					currencySettingChanged = true;
				}
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

		if (currencySettingChanged) {
			try {
				await fetchAndSaveExchangeRates();
			} catch (err) {
				console.error('Failed to refresh exchange rates after currency change:', err);
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

		const cleanupDelayValue = Math.max(
			0,
			Number(formData.get('dataCleanup.scheduled.delayValue')) || 0
		);
		const cleanupDelayUnit = String(formData.get('dataCleanup.scheduled.delayUnit') || 'days');
		if (!(cleanupDelayUnit in DELAY_MULTIPLIERS)) {
			throw error(400, 'Invalid delay unit');
		}
		const cleanupDelaySeconds = cleanupDelayValue * DELAY_MULTIPLIERS[cleanupDelayUnit];

		const dataCleanup = {
			onOrderExpireOrCancel: formData.get('dataCleanup.onOrderExpireOrCancel') === 'on',
			allowUserManualCleanup: formData.get('dataCleanup.allowUserManualCleanup') === 'on',
			scheduled: {
				enabled: formData.get('dataCleanup.scheduled.enabled') === 'on',
				delaySeconds: cleanupDelaySeconds,
				orderStatuses: formData
					.getAll('dataCleanup.scheduled.orderStatuses')
					.map(String)
					.filter((s): s is OrderPaymentStatus =>
						(ORDER_PAYMENT_STATUSES as readonly string[]).includes(s)
					)
			}
		};

		if (JSON.stringify(runtimeConfig.dataCleanup) !== JSON.stringify(dataCleanup)) {
			runtimeConfig.dataCleanup = dataCleanup;
			await persistConfigElement('dataCleanup', dataCleanup);
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
