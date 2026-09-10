import { json, type RequestHandler } from '@sveltejs/kit';
import { apiV1Handler, apiV1OptionsHandler } from '$lib/server/api/v1/handler';
import { requireApiKey } from '$lib/server/api/v1/auth';
import { apiError } from '$lib/server/api/v1/errors';
import { checkRateLimit } from '$lib/server/rateLimit';
import { addOrderNote } from '$lib/server/api/v1/orders/addNote';
import { z } from 'zod';

export const OPTIONS: RequestHandler = apiV1OptionsHandler;

const addNoteSchema = z
	.object({
		content: z.string().trim().min(1).max(5000)
	})
	.strict();

/**
 * Append an employee note to an existing order.
 *
 * The note joins the ones written from the admin, and be-BOP shows order notes to the buyer — so
 * what an integration writes here is read by the customer, not only by the staff.
 *
 * Unlike a label, a note is appended every time: two identical calls leave two notes, because a
 * repeated remark is a fact about the order, not an accident to swallow.
 */
export const POST: RequestHandler = apiV1Handler(async (event) => {
	const apiKeyOrError = await requireApiKey(event, 'orders:write');
	if (apiKeyOrError instanceof Response) {
		return apiKeyOrError;
	}
	const apiKey = apiKeyOrError;

	const limit = checkRateLimit(apiKey._id.toString(), 'api.v1.orders.write', 60, { minutes: 1 });
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

	const parsed = addNoteSchema.safeParse(body);
	if (!parsed.success) {
		return apiError(400, 'VALIDATION_ERROR', 'Invalid note payload', parsed.error.format());
	}

	const result = await addOrderNote({ orderId, content: parsed.data.content });
	if (!result.ok) {
		return apiError(404, 'NOT_FOUND', 'Order not found');
	}

	return json({ ok: true, orderId: result.orderId, notes: result.notes });
});
