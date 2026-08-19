import { json, type RequestHandler } from '@sveltejs/kit';
import { apiV1Handler, apiV1OptionsHandler } from '$lib/server/api/v1/handler';
import { requireApiKey } from '$lib/server/api/v1/auth';
import { apiError } from '$lib/server/api/v1/errors';
import { ordersWriteRequestSchema } from '$lib/server/api/v1/schemas/orders-write';
import { writeBatch } from '$lib/server/api/v1/orders/writeBatch';
import { listOrders } from '$lib/server/api/v1/orders/listPaid';
import { checkRateLimit } from '$lib/server/rateLimit';

export const OPTIONS: RequestHandler = apiV1OptionsHandler;

export const GET: RequestHandler = apiV1Handler(async (event) => {
	const apiKeyOrError = await requireApiKey(event, 'orders:read');
	if (apiKeyOrError instanceof Response) {
		return apiKeyOrError;
	}
	const apiKey = apiKeyOrError;

	const limit = checkRateLimit(apiKey._id.toString(), 'api.v1.orders.read', 60, { minutes: 1 });
	if (limit.limited) {
		return apiError(429, 'RATE_LIMITED', 'Too many requests for this API key', undefined, {
			'Retry-After': String(limit.retryAfterSeconds)
		});
	}

	const url = event.url;
	const result = await listOrders({
		since: url.searchParams.get('since') ?? undefined,
		until: url.searchParams.get('until') ?? undefined,
		limit: url.searchParams.get('limit') ?? undefined,
		cursor: url.searchParams.get('cursor') ?? undefined,
		productId: url.searchParams.get('productId') ?? undefined,
		status: url.searchParams.get('status') ?? undefined,
		number: url.searchParams.get('number') ?? undefined,
		label: url.searchParams.get('label') ?? undefined,
		externalOrderId: url.searchParams.get('externalOrderId') ?? undefined,
		apiKeyId: apiKey._id
	});
	if ('error' in result) {
		return apiError(400, 'VALIDATION_ERROR', result.error.message, {
			field: result.error.field
		});
	}

	return json({
		ok: true,
		orders: result.orders,
		page: result.page
	});
});

export const POST: RequestHandler = apiV1Handler(async (event) => {
	const { request, locals } = event;
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

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return apiError(400, 'VALIDATION_ERROR', 'Request body must be JSON');
	}

	const parsed = ordersWriteRequestSchema.safeParse(body);
	if (!parsed.success) {
		return apiError(400, 'VALIDATION_ERROR', 'Invalid orders write payload', parsed.error.format());
	}

	const result = await writeBatch({
		apiKey,
		orders: parsed.data.orders,
		clientIp: locals.clientIp
	});

	return json(result);
});
