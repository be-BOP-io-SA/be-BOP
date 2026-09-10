import { json, type RequestHandler } from '@sveltejs/kit';
import { apiV1Handler, apiV1OptionsHandler } from '$lib/server/api/v1/handler';
import { requireApiKey } from '$lib/server/api/v1/auth';
import { apiError } from '$lib/server/api/v1/errors';
import { jsonWithETag } from '$lib/server/api/v1/validators';
import { checkRateLimit } from '$lib/server/rateLimit';
import { findOrderCursor, parseStreamSince } from '$lib/server/api/v1/orders/paidStream';
import { listPosPaidOrders } from '$lib/server/api/v1/pos/paidEvents';
import { ingestPosSales } from '$lib/server/api/v1/pos/sales';
import { posSalesRequestSchema } from '$lib/server/api/v1/pos/schemas';
import { ZodError } from 'zod';

export const OPTIONS: RequestHandler = apiV1OptionsHandler;

/** The seam caps a batch at what one till can push in a round; the schema caps it again at 100. */
const MAX_BODY_BYTES = 2 * 1024 * 1024;

/**
 * Paid orders, one page at a time. The primary transport.
 *
 * Same feed and same `since_ts` / `last_event_id` vocabulary as the stream on
 * `/api/v1/pos/orders/stream`: a client that cannot hold a connection open polls here instead,
 * without relearning anything. `nextCursor` is the last order id of the page — feed it back as
 * `last_event_id` — and is null once the page is the tail.
 */
const DEFAULT_PAGE = 100;
const MAX_PAGE = 500;

export const GET: RequestHandler = apiV1Handler(async (event) => {
	const apiKeyOrError = await requireApiKey(event, 'pos:read');
	if (apiKeyOrError instanceof Response) {
		return apiKeyOrError;
	}
	const apiKey = apiKeyOrError;

	const limit = checkRateLimit(apiKey._id.toString(), 'api.v1.pos.read', 120, { minutes: 1 });
	if (limit.limited) {
		return apiError(429, 'RATE_LIMITED', 'Too many requests for this API key', undefined, {
			'Retry-After': String(limit.retryAfterSeconds)
		});
	}

	const since = parseStreamSince(event.url.searchParams.get('since_ts') ?? undefined, undefined);
	if ('error' in since) {
		return apiError(400, 'VALIDATION_ERROR', since.error.message, { field: since.error.field });
	}

	const rawLimit = event.url.searchParams.get('limit');
	let pageSize = DEFAULT_PAGE;
	if (rawLimit !== null) {
		const parsed = Number.parseInt(rawLimit, 10);
		if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > MAX_PAGE) {
			return apiError(400, 'VALIDATION_ERROR', `limit must be between 1 and ${MAX_PAGE}`, {
				field: 'limit'
			});
		}
		pageSize = parsed;
	}

	const lastEventId = event.url.searchParams.get('last_event_id');
	const after = lastEventId ? await findOrderCursor(lastEventId.trim()) : null;

	// Naming a tag narrows the feed to orders carrying a line tagged with it, and reduces `amount`
	// to that line. be-BOP holds no domain word: the caller says which tag it means.
	const tag = event.url.searchParams.get('tag')?.trim() || undefined;

	const page = await listPosPaidOrders({ since: since.date, after, limit: pageSize, tag });
	return jsonWithETag(page, event.request);
});

/**
 * Till sales, batched. Idempotent on `externalOrderId`.
 *
 * A malformed batch is rejected whole and nothing is ingested: a partially-applied batch would
 * leave the caller unable to say what landed.
 *
 * A sale the shop refuses for good — an unsupported currency, an unknown product — is a 400 naming
 * it, and `details.ingested` lists the references of the same batch that did land. The till fixes
 * the batch and re-pushes it whole; the listed references settle as no-ops. A refusal that may
 * clear on its own stays a 500, which is what a retrying client should see.
 */
export const POST: RequestHandler = apiV1Handler(async (event) => {
	const apiKeyOrError = await requireApiKey(event, 'pos:write');
	if (apiKeyOrError instanceof Response) {
		return apiKeyOrError;
	}
	const apiKey = apiKeyOrError;

	const limit = checkRateLimit(apiKey._id.toString(), 'api.v1.pos.write', 60, { minutes: 1 });
	if (limit.limited) {
		return apiError(429, 'RATE_LIMITED', 'Too many requests for this API key', undefined, {
			'Retry-After': String(limit.retryAfterSeconds)
		});
	}

	const contentLength = Number(event.request.headers.get('content-length') ?? '0');
	if (contentLength > MAX_BODY_BYTES) {
		return apiError(400, 'VALIDATION_ERROR', 'Request body too large');
	}

	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		return apiError(400, 'VALIDATION_ERROR', 'Body must be valid JSON');
	}

	const parsed = posSalesRequestSchema.safeParse(body);
	if (!parsed.success) {
		const issue = (parsed.error as ZodError).issues[0];
		return apiError(400, 'VALIDATION_ERROR', issue?.message ?? 'Invalid batch', {
			field: issue?.path.join('.') ?? ''
		});
	}

	const outcome = await ingestPosSales({
		apiKey,
		sales: parsed.data,
		clientIp: event.locals.clientIp
	});
	if ('rejection' in outcome) {
		const { externalOrderId, code, message, details, ingested } = outcome.rejection;
		return apiError(400, 'VALIDATION_ERROR', message, {
			externalOrderId,
			code,
			...(details && { domain: details }),
			ingested
		});
	}
	return json(outcome.response);
});
