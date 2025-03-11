import { CURRENCIES } from '$lib/types/Currency';
import { MAX_NAME_LIMIT, MAX_SHORT_DESCRIPTION_LIMIT } from '$lib/types/Product';
import { z } from 'zod';
import { deliveryFeesSchema } from '../config/delivery/schema';
import { MAX_CONTENT_LIMIT } from '$lib/types/CmsPage';
import { zodObjectId } from '$lib/server/zod';
import { paymentMethods, type PaymentMethod } from '$lib/server/payment-methods';

export const productBaseSchema = () => ({
	name: z.string().trim().min(1).max(MAX_NAME_LIMIT),
	alias: z.string().trim().max(MAX_NAME_LIMIT).optional(),
	description: z.string().trim().max(10_000),
	shortDescription: z.string().trim().max(MAX_SHORT_DESCRIPTION_LIMIT),
	priceAmount: z
		.string()
		.regex(/^\d+(\.\d+)?$/)
		.default('0'),
	priceCurrency: z.enum([CURRENCIES[0], ...CURRENCIES.slice(1)]),
	availableDate: z.date({ coerce: true }).optional(),
	preorder: z.boolean({ coerce: true }).default(false),
	customPreorderText: z.string().trim().max(1_000).min(1).optional(),
	shipping: z.boolean({ coerce: true }).default(false),
	displayShortDescription: z.boolean({ coerce: true }).default(false),
	deliveryFees: deliveryFeesSchema.optional(),
	restrictPaymentMethods: z.boolean({ coerce: true }).default(false),
	paymentMethods: z
		.array(z.enum(paymentMethods({ includePOS: true }) as [PaymentMethod, ...PaymentMethod[]]))
		.optional(),
	applyDeliveryFeesOnlyOnce: z.boolean({ coerce: true }).default(false),
	requireSpecificDeliveryFee: z.boolean({ coerce: true }).default(false),
	payWhatYouWant: z.boolean({ coerce: true }).default(false),
	hasMaximumPrice: z.boolean({ coerce: true }).default(false),
	maxPriceAmount: z
		.string()
		.regex(/^\d+(\.\d+)?$/)
		.optional(),
	standalone: z.boolean({ coerce: true }).default(false),
	free: z.boolean({ coerce: true }).default(false),
	stock: z.number({ coerce: true }).int().min(0).optional(),
	maxQuantityPerOrder: z.number({ coerce: true }).int().min(1).optional(),
	eshopVisible: z.boolean({ coerce: true }).default(false),
	retailVisible: z.boolean({ coerce: true }).default(false),
	nostrVisible: z.boolean({ coerce: true }).default(false),
	googleShoppingVisible: z.boolean({ coerce: true }).default(false),
	eshopBasket: z.boolean({ coerce: true }).default(false),
	retailBasket: z.boolean({ coerce: true }).default(false),
	nostrBasket: z.boolean({ coerce: true }).default(false),
	isTicket: z.boolean({ coerce: true }).default(false),
	depositPercentage: z.number({ coerce: true }).int().min(0).max(100).optional(),
	enforceDeposit: z.boolean({ coerce: true }).default(false),
	vatProfileId: zodObjectId().or(z.literal('')).optional(),
	cta: z
		.array(
			z.object({
				href: z.string().trim(),
				label: z.string().trim(),
				fallback: z.boolean({ coerce: true }).default(false)
			})
		)
		.optional()
		.default([]),
	externalResources: z
		.array(
			z.object({
				href: z.string().trim(),
				label: z.string().trim()
			})
		)
		.optional()
		.default([]),
	hasVariations: z.boolean({ coerce: true }).default(false),
	variations: z
		.array(
			z.object({
				name: z.string().trim(),
				value: z.string().trim(),
				price: z
					.string()
					.regex(/^\d+(\.\d+)?$/)
					.default('0')
			})
		)
		.optional()
		.default([]),
	variationLabels: z
		.object({
			names: z.record(z.string().trim(), z.string().trim()),
			values: z.record(z.string().trim(), z.record(z.string().trim(), z.string().trim()))
		})
		.optional(),
	contentBefore: z.string().max(MAX_CONTENT_LIMIT).default(''),
	contentAfter: z.string().max(MAX_CONTENT_LIMIT).default(''),
	hideContentBefore: z.boolean({ coerce: true }).default(false),
	hideContentAfter: z.boolean({ coerce: true }).default(false),
	hasSellDisclaimer: z.boolean({ coerce: true }).default(false),
	sellDisclaimerTitle: z.string().trim().max(60).optional(),
	sellDisclaimerReason: z.string().trim().max(10_000).optional(),
	hideFromSEO: z.boolean({ coerce: true }).default(false)
});
