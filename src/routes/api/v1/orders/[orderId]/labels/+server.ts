import { json, type RequestHandler } from '@sveltejs/kit';
import { apiV1Handler, apiV1OptionsHandler } from '$lib/server/api/v1/handler';
import { requireApiKey } from '$lib/server/api/v1/auth';
import { apiError } from '$lib/server/api/v1/errors';
import { checkRateLimit } from '$lib/server/rateLimit';
import { addOrderLabel } from '$lib/server/api/v1/orders/addLabel';
import { z } from 'zod';

export const OPTIONS: RequestHandler = apiV1OptionsHandler;

const addLabelSchema = z
	.object({
		labelId: z.string().trim().min(1).max(200),
		/**
		 * How the label should look if the shop does not have it yet. All optional, all ignored when
		 * the label already exists: a caller labels its own orders, it does not restyle the shop's.
		 */
		name: z.string().trim().min(1).max(100).optional(),
		color: z.string().trim().min(1).max(100).optional(),
		icon: z.string().trim().min(1).max(100).optional()
	})
	.strict();

/**
 * Put an order label on an order that already exists.
 *
 * Labels are how the shop sorts its orders after the fact — "to refund", "disputed", "collected".
 * An integrator sees things be-BOP does not, so it gets to say so on the order rather than only in
 * its own database.
 *
 * Repeating the call is safe: the label is added to a set, and the response is the same either way.
 */
export const POST: RequestHandler = apiV1Handler(async (event) => {
	const apiKeyOrError = await requireApiKey(event, 'orders:write');
	if (apiKeyOrError instanceof Response) {
		return apiKeyOrError;
	}
	const apiKey = apiKeyOrError;

	const limit = checkRateLimit(apiKey._id.toString(), 'api.v1.orders.write', 1200, { minutes: 1 });
	if (limit.limited) {
		return apiError(429, 'RATE_LIMITED', 'Too many requests for this API key', undefined, {
			'Retry-After': String(limit.retryAfterSeconds)
		});
	}

	// apiV1Handler hands back a generic RequestEvent, so params are Partial. Narrow, do not assert.
	const orderId = event.params.orderId;
	if (!orderId) {
		return apiError(404, 'NOT_FOUND', 'Order not found');
	}

	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		return apiError(400, 'VALIDATION_ERROR', 'Request body must be JSON');
	}

	const parsed = addLabelSchema.safeParse(body);
	if (!parsed.success) {
		return apiError(400, 'VALIDATION_ERROR', 'Invalid label payload', parsed.error.format());
	}

	const { labelId, name, color, icon } = parsed.data;
	const wantedLook = name || color || icon ? { name, color, icon } : undefined;
	const result = await addOrderLabel({
		orderId,
		labelId,
		...(wantedLook && { label: wantedLook })
	});
	if (!result.ok) {
		return result.reason === 'ORDER_NOT_FOUND'
			? apiError(404, 'NOT_FOUND', 'Order not found')
			: apiError(400, 'VALIDATION_ERROR', `Label id cannot be created: ${labelId}`, { labelId });
	}

	return json({
		ok: true,
		orderId: result.orderId,
		labels: result.labels,
		labelCreated: result.labelCreated
	});
});
