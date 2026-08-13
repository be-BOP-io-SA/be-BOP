import { z } from 'zod';
import { CURRENCIES } from '$lib/types/Currency';
import {
	API_V1_BATCH_STATUSES,
	API_V1_RESULT_STATUSES,
	API_V1_WARNING_CODES
} from '$lib/types/ApiV1';

const currencySchema = z.enum(CURRENCIES);

const amountMinorSchema = z
	.number()
	.int('amountMinor must be an integer (minor units)')
	.nonnegative('amountMinor must be >= 0');

const customPriceSchema = z
	.object({
		amountMinor: amountMinorSchema,
		currency: currencySchema
	})
	.strict();

const orderItemSchema = z
	.object({
		productId: z.string().trim().min(1).max(200),
		quantity: z.number().int().positive().max(1_000_000),
		customPrice: customPriceSchema.optional(),
		chosenVariations: z.record(z.string(), z.string()).optional(),
		uniqueKey: z
			.string()
			.trim()
			.min(1)
			.max(128)
			.regex(/^[A-Za-z0-9_-]+$/)
			.optional()
	})
	.strict();

const paymentSchema = z
	.object({
		method: z.literal('point-of-sale'),
		status: z.enum(['pending', 'paid', 'canceled', 'failed', 'expired']).default('paid'),
		amountMinor: amountMinorSchema,
		currency: currencySchema,
		posLabel: z.string().trim().max(200).optional(),
		/** Strongly recommended stable PoS payment id on every payment for safe retries / reorder / splits. */
		externalPaymentId: z.string().trim().min(1).max(200).optional()
	})
	.strict();

const CUSTOM_FIELDS_MAX_KEYS = 50;
const CUSTOM_FIELD_KEY_MAX_LEN = 100;

const customFieldsSchema = z
	.record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
	.optional()
	.superRefine((val, ctx) => {
		if (!val) {
			return;
		}
		const entries = Object.entries(val);
		if (entries.length > CUSTOM_FIELDS_MAX_KEYS) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `customFields must have at most ${CUSTOM_FIELDS_MAX_KEYS} keys`
			});
		}
		for (const [key] of entries) {
			if (key.length > CUSTOM_FIELD_KEY_MAX_LEN) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: `customFields key length must be <= ${CUSTOM_FIELD_KEY_MAX_LEN}`,
					path: [key]
				});
			}
		}
	});

/** Reject createdAt outside ±365 days from now (VALIDATION_ERROR at the HTTP layer). */
const CREATED_AT_MAX_SKEW_MS = 365 * 24 * 60 * 60 * 1000;

function refinePaymentCurrency(
	payment: z.infer<typeof paymentSchema>,
	orderCurrency: z.infer<typeof currencySchema>,
	ctx: z.RefinementCtx,
	pathPrefix: (string | number)[]
) {
	if (payment.currency !== orderCurrency) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: 'payment.currency must equal order.currency',
			path: [...pathPrefix, 'currency']
		});
	}
}

const orderCommandSchema = z
	.object({
		externalOrderId: z.string().trim().min(1).max(200),
		currency: currencySchema,
		createdAt: z.string().datetime({ offset: true }).optional(),
		items: z.array(orderItemSchema).min(1).max(500),
		/** Singular payment (mono PoS). Prefer `payments` when sending more than one. */
		payment: paymentSchema.optional(),
		/** One or more payments. When both `payment` and `payments` are set, `payments` wins. */
		payments: z.array(paymentSchema).min(1).max(50).optional(),
		customFields: customFieldsSchema,
		notes: z.string().max(5000).optional()
	})
	.strict()
	.superRefine((order, ctx) => {
		const payments = order.payments?.length ? order.payments : order.payment ? [order.payment] : [];
		if (payments.length === 0) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Either payment or payments is required',
				path: ['payment']
			});
		}
		payments.forEach((payment, index) => {
			const pathPrefix = order.payments?.length
				? (['payments', index] as (string | number)[])
				: (['payment'] as (string | number)[]);
			refinePaymentCurrency(payment, order.currency, ctx, pathPrefix);
		});
		order.items.forEach((item, index) => {
			if (item.customPrice && item.customPrice.currency !== order.currency) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'items[].customPrice.currency must equal order.currency',
					path: ['items', index, 'customPrice', 'currency']
				});
			}
		});
		if (order.createdAt) {
			const t = Date.parse(order.createdAt);
			if (!Number.isNaN(t)) {
				const skew = Math.abs(t - Date.now());
				if (skew > CREATED_AT_MAX_SKEW_MS) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: 'createdAt must be within ±365 days of now',
						path: ['createdAt']
					});
				}
			}
		}
	});

/**
 * POST /api/v1/orders request body.
 *
 * Idempotence (D2): uniqueness is (externalSourceApiKeyId, externalOrderId) — sparse unique
 * index on Order. Documented here; enforced at persistence in lot D.
 *
 * currencySnapshot is rejected by .strict() on every object (D4) — no custom superRefine needed.
 */
export const ordersWriteRequestSchema = z
	.object({
		orders: z.array(orderCommandSchema).min(1).max(100)
	})
	.strict();

export type OrdersWriteRequest = z.infer<typeof ordersWriteRequestSchema>;
export type OrderWriteCommand = z.infer<typeof orderCommandSchema>;
export type OrderPaymentWrite = z.infer<typeof paymentSchema>;

/** Normalize singular `payment` or `payments[]` into a payments array (`payments` wins). */
export function normalizeOrderPayments(cmd: OrderWriteCommand): OrderPaymentWrite[] {
	if (cmd.payments?.length) {
		return cmd.payments;
	}
	if (cmd.payment) {
		return [cmd.payment];
	}
	return [];
}

const warningSchema = z.object({
	code: z.enum(API_V1_WARNING_CODES),
	message: z.string(),
	productId: z.string().optional(),
	details: z.record(z.unknown()).optional()
});

const orderResultSchema = z.object({
	externalOrderId: z.string(),
	status: z.enum(API_V1_RESULT_STATUSES),
	orderId: z.string().optional(),
	warnings: z.array(warningSchema).optional(),
	error: z
		.object({
			code: z.string(),
			message: z.string(),
			details: z.record(z.unknown()).optional()
		})
		.optional()
});

export const ordersWriteResponseSchema = z.object({
	ok: z.boolean(),
	status: z.enum(API_V1_BATCH_STATUSES),
	results: z.array(orderResultSchema)
});

export type OrdersWriteResponse = z.infer<typeof ordersWriteResponseSchema>;
