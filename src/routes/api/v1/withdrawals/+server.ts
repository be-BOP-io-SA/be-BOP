import { json, type RequestHandler } from '@sveltejs/kit';
import { apiV1Handler, apiV1OptionsHandler } from '$lib/server/api/v1/handler';
import { requireApiKey } from '$lib/server/api/v1/auth';
import { apiError } from '$lib/server/api/v1/errors';
import { checkRateLimit } from '$lib/server/rateLimit';
import { collections } from '$lib/server/database';
import {
	checkWithdrawReadiness,
	createLnurlWithdraw,
	withdrawAmountToSat,
	withdrawQrCodeSvg,
	withdrawUrls
} from '$lib/server/lnurlWithdraw';
import { CURRENCIES } from '$lib/types/Currency';
import { z } from 'zod';

export const OPTIONS: RequestHandler = apiV1OptionsHandler;

/** Short on purpose: a code left on a counter is sats anyone can take. Override with expiresInSeconds. */
const DEFAULT_EXPIRY_SECONDS = 5 * 60;

const withdrawRequestSchema = z
	.object({
		/** Lower bound the wallet may choose. Defaults to the maximum: a fixed-amount withdraw. */
		minSat: z.number().int().positive().max(100_000_000).optional(),
		maxSat: z.number().int().positive().max(100_000_000).optional(),
		/**
		 * The same offer named in the shop's own currency: a till knows it owes 4,00 CHF, not how
		 * many sats that is this afternoon. Converted at the shop's current rate, once, when the
		 * withdraw is created — the code that comes out is denominated in sats like any other.
		 */
		amount: z.number().positive().max(1_000_000_000).optional(),
		minAmount: z.number().positive().max(1_000_000_000).optional(),
		currency: z.enum(CURRENCIES).optional(),
		description: z.string().trim().min(1).max(200).optional(),
		/** The order this withdraw settles. Optional — a withdraw can stand on its own. */
		orderId: z.string().trim().min(1).max(200).optional(),
		expiresInSeconds: z
			.number()
			.int()
			.min(60)
			.max(7 * 24 * 3600)
			.optional(),
		/**
		 * Return the code in the response body rather than as a link. A till that prints a ticket
		 * has nowhere to fetch an image from, so it gets the SVG inline.
		 */
		includeQrCode: z.boolean().optional()
	})
	.strict()
	.superRefine((body, ctx) => {
		const issue = (message: string, path: string) =>
			ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: [path] });

		// One way of naming the amount, never two: a payload carrying both would leave the shop to
		// guess which one the till meant.
		if ((body.maxSat === undefined) === (body.amount === undefined)) {
			issue('Provide either maxSat, or amount with currency', 'maxSat');
		}
		if (body.amount !== undefined && body.currency === undefined) {
			issue('currency is required when the amount is not in sats', 'currency');
		}
		if (body.currency !== undefined && body.amount === undefined) {
			issue('currency only applies to amount', 'currency');
		}
		if (body.minSat !== undefined) {
			if (body.maxSat === undefined) {
				issue('minSat only applies to maxSat', 'minSat');
			} else if (body.minSat > body.maxSat) {
				issue('minSat must not exceed maxSat', 'minSat');
			}
		}
		if (body.minAmount !== undefined) {
			if (body.amount === undefined) {
				issue('minAmount only applies to amount', 'minAmount');
			} else if (body.minAmount > body.amount) {
				issue('minAmount must not exceed amount', 'minAmount');
			}
		}
	});

/**
 * Offer a withdraw: the shop's node will pay whoever scans the code, up to `maxSat`.
 *
 * The node is asked whether it can honour the ceiling before the link exists, so a shop that is
 * short, unplugged, unconfigured or without a channel learns it here rather than leaving a
 * customer with a code that fails in their hand. It is asked again when the code is used.
 */
export const POST: RequestHandler = apiV1Handler(async (event) => {
	const apiKeyOrError = await requireApiKey(event, 'withdraw:write');
	if (apiKeyOrError instanceof Response) {
		return apiKeyOrError;
	}
	const apiKey = apiKeyOrError;

	const limit = checkRateLimit(apiKey._id.toString(), 'api.v1.withdraw.write', 30, { minutes: 1 });
	if (limit.limited) {
		return apiError(429, 'RATE_LIMITED', 'Too many requests for this API key', undefined, {
			'Retry-After': String(limit.retryAfterSeconds)
		});
	}

	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		return apiError(400, 'VALIDATION_ERROR', 'Request body must be JSON');
	}

	const parsed = withdrawRequestSchema.safeParse(body);
	if (!parsed.success) {
		return apiError(400, 'VALIDATION_ERROR', 'Invalid withdraw payload', parsed.error.format());
	}

	const { description, orderId, amount, minAmount, currency } = parsed.data;

	let maxSat: number;
	let minSat: number;

	if (amount !== undefined && currency !== undefined) {
		const converted = withdrawAmountToSat(amount, currency);
		if ('error' in converted) {
			return apiError(400, 'VALIDATION_ERROR', converted.error);
		}
		const convertedMin =
			minAmount !== undefined ? withdrawAmountToSat(minAmount, currency) : converted;
		if ('error' in convertedMin) {
			return apiError(400, 'VALIDATION_ERROR', convertedMin.error);
		}

		maxSat = converted.sat;
		minSat = convertedMin.sat;

		// The sats ceiling is a hard limit of the endpoint, whichever way the amount was named.
		if (maxSat > 100_000_000) {
			return apiError(
				400,
				'VALIDATION_ERROR',
				`${amount} ${currency} converts to ${maxSat} sat, over the 100000000 sat ceiling`
			);
		}
	} else {
		maxSat = parsed.data.maxSat as number;
		minSat = parsed.data.minSat ?? maxSat;
	}

	if (orderId) {
		const order = await collections.orders.findOne({ _id: orderId }, { projection: { _id: 1 } });
		if (!order) {
			return apiError(404, 'NOT_FOUND', `Order not found: ${orderId}`);
		}
	}

	// The ceiling is what the shop must be able to pay: the wallet is free to ask for it.
	const readiness = await checkWithdrawReadiness(maxSat);
	if (!readiness.ready) {
		return apiError(409, 'WITHDRAW_UNAVAILABLE', readiness.message, {
			reason: readiness.blocker,
			...(readiness.details ?? {})
		});
	}

	const withdraw = await createLnurlWithdraw({
		minSat,
		maxSat,
		description: description ?? 'be-BOP withdraw',
		apiKeyId: apiKey._id,
		...(orderId && { orderId }),
		...(currency && { requestedAmount: amount, requestedCurrency: currency }),
		expiresInSeconds: parsed.data.expiresInSeconds ?? DEFAULT_EXPIRY_SECONDS
	});

	const { url, lnurl, lnurlw } = withdrawUrls(withdraw._id);

	return json({
		ok: true,
		withdrawId: withdraw._id,
		/** LUD-01 address: what a wallet expects when it is handed text rather than a link. */
		lnurl,
		lnurlw,
		url,
		qrCodeUrl: `${url}/qrcode`,
		...(parsed.data.includeQrCode && { qrCodeSvg: await withdrawQrCodeSvg(withdraw._id) }),
		minSat: withdraw.minSat,
		maxSat: withdraw.maxSat,
		/** Echo of what was asked, when it was asked in a currency, so the ticket can print it. */
		...(currency && {
			requested: {
				currency,
				amount,
				...(minAmount !== undefined && { minAmount })
			}
		}),
		description: withdraw.description,
		...(withdraw.orderId && { orderId: withdraw.orderId }),
		expiresAt: withdraw.expiresAt.toISOString(),
		status: withdraw.status
	});
});
