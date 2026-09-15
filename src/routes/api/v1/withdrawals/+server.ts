import { json, type RequestHandler } from '@sveltejs/kit';
import { apiV1Handler, apiV1OptionsHandler } from '$lib/server/api/v1/handler';
import { requireApiKey } from '$lib/server/api/v1/auth';
import { apiError } from '$lib/server/api/v1/errors';
import { checkRateLimit } from '$lib/server/rateLimit';
import { collections } from '$lib/server/database';
import {
	checkWithdrawReadiness,
	createLnurlWithdraw,
	withdrawUrls
} from '$lib/server/lnurlWithdraw';
import { z } from 'zod';

export const OPTIONS: RequestHandler = apiV1OptionsHandler;

const DEFAULT_EXPIRY_SECONDS = 15 * 60;

const withdrawRequestSchema = z
	.object({
		/** Lower bound the wallet may choose. Defaults to the maximum: a fixed-amount withdraw. */
		minSat: z.number().int().positive().max(100_000_000).optional(),
		maxSat: z.number().int().positive().max(100_000_000),
		description: z.string().trim().min(1).max(200).optional(),
		/** The order this withdraw settles. Optional — a withdraw can stand on its own. */
		orderId: z.string().trim().min(1).max(200).optional(),
		expiresInSeconds: z
			.number()
			.int()
			.min(60)
			.max(7 * 24 * 3600)
			.optional()
	})
	.strict()
	.superRefine((body, ctx) => {
		if (body.minSat !== undefined && body.minSat > body.maxSat) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'minSat must not exceed maxSat',
				path: ['minSat']
			});
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

	const { maxSat, description, orderId } = parsed.data;
	const minSat = parsed.data.minSat ?? maxSat;

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
		expiresInSeconds: parsed.data.expiresInSeconds ?? DEFAULT_EXPIRY_SECONDS
	});

	const { url, lnurl } = withdrawUrls(withdraw._id);

	return json({
		ok: true,
		withdrawId: withdraw._id,
		lnurl,
		url,
		minSat: withdraw.minSat,
		maxSat: withdraw.maxSat,
		description: withdraw.description,
		...(withdraw.orderId && { orderId: withdraw.orderId }),
		expiresAt: withdraw.expiresAt.toISOString(),
		status: withdraw.status
	});
});
