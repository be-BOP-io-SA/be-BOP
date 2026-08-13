import { json, type RequestHandler } from '@sveltejs/kit';
import { apiV1Handler, apiV1OptionsHandler } from '$lib/server/api/v1/handler';
import { requireApiKey } from '$lib/server/api/v1/auth';
import { apiError } from '$lib/server/api/v1/errors';
import { listPaidOrders } from '$lib/server/api/v1/orders/listPaid';
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
	const result = await listPaidOrders({
		since: url.searchParams.get('since') ?? undefined,
		until: url.searchParams.get('until') ?? undefined,
		limit: url.searchParams.get('limit') ?? undefined,
		cursor: url.searchParams.get('cursor') ?? undefined
	});

	return json({
		ok: true,
		orders: result.orders,
		page: result.page
	});
});
