import { describe, expect, it } from 'vitest';
import { buildOpenApiDocument } from './openapi';

describe('buildOpenApiDocument', () => {
	it('returns OpenAPI 3 document with openapi field and core paths', () => {
		const doc = buildOpenApiDocument({ serverUrl: 'https://shop.example' });
		expect(doc.openapi).toMatch(/^3\./);
		expect(doc.info.version).toBe('v1');
		expect(doc.paths['/api/v1/health']).toBeTruthy();
		expect(doc.paths['/api/v1/orders']).toBeTruthy();
		expect(doc.paths['/api/v1/catalog/products']).toBeTruthy();
		expect(doc.paths['/api/v1/orders/paid']).toBeTruthy();
		expect(doc.paths['/api/v1/orders/paid/stream']).toBeTruthy();
		expect(doc.paths['/api/v1/openapi.json']).toBeTruthy();
		expect(doc.paths['/api/v1/docs']).toBeTruthy();
		expect(doc.components.securitySchemes.BearerAuth).toBeTruthy();
		expect(doc.components.securitySchemes.ApiKeyAuth).toBeTruthy();
		expect(doc.servers[0].url).toBe('https://shop.example');
	});

	it('documents orders write security scopes and reusable schemas', () => {
		const doc = buildOpenApiDocument();
		const post = doc.paths['/api/v1/orders'].post;
		expect(post.security).toEqual([
			{ BearerAuth: ['orders:write'] },
			{ ApiKeyAuth: ['orders:write'] }
		]);
		expect(post.requestBody.content['application/json'].schema).toEqual({
			$ref: '#/components/schemas/OrderWriteRequest'
		});
		expect(doc.components.schemas.OrderWriteRequest).toBeTruthy();
		expect(doc.components.schemas.OrderWriteCommand).toBeTruthy();
		const statusEnum = doc.components.schemas.OrdersWriteResponse.properties.status.enum;
		expect(statusEnum).toContain('ok_with_warnings');
		expect(statusEnum).toContain('ok_with_errors');
	});

	it('documents catalog:read, orders:read, and paid-orders poll', () => {
		const doc = buildOpenApiDocument();
		expect(doc.tags.some((t) => t.name === 'catalog')).toBe(true);
		expect(doc.paths['/api/v1/catalog/products']).toBeTruthy();
		expect(doc.paths['/api/v1/catalog/products/{id}']).toBeTruthy();
		expect(doc.paths['/api/v1/orders/paid']).toBeTruthy();
		expect(doc.info.description).toMatch(/catalog:read/);
		expect(doc.info.description).toMatch(/orders:read/);
		expect(doc.components.securitySchemes.BearerAuth.description).toMatch(/orders:write/);
		expect(doc.components.securitySchemes.BearerAuth.description).toMatch(/catalog:read/);
		const catalogGet = doc.paths['/api/v1/catalog/products'].get;
		expect(catalogGet.security).toEqual([
			{ BearerAuth: ['catalog:read'] },
			{ ApiKeyAuth: ['catalog:read'] }
		]);
		const paidGet = doc.paths['/api/v1/orders/paid'].get;
		expect(paidGet.security).toEqual([
			{ BearerAuth: ['orders:read'] },
			{ ApiKeyAuth: ['orders:read'] }
		]);
	});

	it('documents pictures as be-BOP links in every generated size, never object storage', () => {
		const doc = buildOpenApiDocument();
		expect(doc.components.schemas.CatalogProduct.properties.picture).toEqual({
			$ref: '#/components/schemas/CatalogPicture'
		});
		expect(doc.components.schemas.PosImageData.allOf).toEqual([
			{ $ref: '#/components/schemas/CatalogPicture' }
		]);

		const picture = doc.components.schemas.CatalogPicture;
		expect(picture.required).toEqual(['url', 'width', 'height', 'formats']);
		expect(picture.description).toMatch(/never at object storage/i);
		// The bytes come from the API's own route, not the storefront one headless mode gates.
		const bytesPath = /\/api\/v1\/catalog\/products\/.+\/picture\/\d+$/;
		expect(picture.properties.url.example).toMatch(bytesPath);
		expect(picture.properties.formats.items.properties.url.example).toMatch(bytesPath);
		expect(doc.paths['/api/v1/catalog/products/{id}/picture/{width}']).toBeTruthy();
	});

	it('documents the per-product picture endpoint as JSON, like the rest of the surface', () => {
		const get = buildOpenApiDocument().paths['/api/v1/catalog/products/{id}/picture'].get;
		expect(get.security).toEqual([
			{ BearerAuth: ['catalog:read'] },
			{ ApiKeyAuth: ['catalog:read'] }
		]);
		expect(Object.keys(get.responses['200'].content)).toEqual(['application/json']);
		expect(get.responses['200'].content['application/json'].schema.properties.picture).toEqual({
			$ref: '#/components/schemas/CatalogPicture'
		});
		expect(get.responses['304']).toBeTruthy();
	});

	it('documents the paid-order SSE stream: event-stream body, since_ts, Last-Event-ID', () => {
		const get = buildOpenApiDocument().paths['/api/v1/orders/paid/stream'].get;
		// Streaming is its own scope: holding a connection open is not the same as reading a page.
		expect(get.security).toEqual([
			{ BearerAuth: ['orders:stream'] },
			{ ApiKeyAuth: ['orders:stream'] }
		]);
		expect(get.responses['200'].content['text/event-stream']).toBeTruthy();
		const names = get.parameters.map((param) => param.name);
		expect(names).toContain('since_ts');
		expect(names).toContain('Last-Event-ID');
		expect(get.description).toMatch(/heartbeat/);
	});

	it('documents the PoS seam as its own surface, in the seam wire shapes', () => {
		const doc = buildOpenApiDocument();
		expect(doc.tags.some((tag) => tag.name === 'pos')).toBe(true);

		const catalog = doc.paths['/api/v1/pos/products'].get;
		// Its own scope: a till credential must not double as a general catalog reader.
		expect(catalog.security).toEqual([{ BearerAuth: ['pos:read'] }, { ApiKeyAuth: ['pos:read'] }]);
		// Whole catalog, no page cursor.
		expect(catalog.parameters.map((param) => param.name)).toEqual([
			'picture',
			'sizes',
			'If-None-Match'
		]);
		expect(catalog.responses['304']).toBeTruthy();

		// tagIds alone is a list of slugs; the dictionary resolves them.
		const catalogSchema = catalog.responses['200'].content['application/json'].schema;
		expect(catalogSchema.required).toEqual(['products', 'tags']);
		expect(catalogSchema.properties.tags.items).toEqual({
			$ref: '#/components/schemas/PosCatalogTag'
		});

		const stream = doc.paths['/api/v1/pos/orders/stream'].get;
		expect(stream.responses['200'].content['text/event-stream']).toBeTruthy();
		expect(stream.description).toMatch(/advisory/);
		expect(stream.description).toMatch(/at-least-once/);

		expect(stream.security).toEqual([
			{ BearerAuth: ['pos:stream'] },
			{ ApiKeyAuth: ['pos:stream'] }
		]);

		// The poll is the primary transport and shares the stream's resume vocabulary.
		const poll = doc.paths['/api/v1/pos/orders'].get;
		expect(poll.security).toEqual([{ BearerAuth: ['pos:read'] }, { ApiKeyAuth: ['pos:read'] }]);
		expect(poll.parameters.map((param) => param.name)).toEqual([
			'since_ts',
			'last_event_id',
			'tag',
			'limit',
			'If-None-Match'
		]);

		const push = doc.paths['/api/v1/pos/orders'].post;
		expect(push.security).toEqual([{ BearerAuth: ['pos:write'] }, { ApiKeyAuth: ['pos:write'] }]);
		expect(push.requestBody.content['application/json'].schema.type).toBe('array');
	});

	it('keeps the PoS wire shapes distinct from the general API ones', () => {
		const schemas = buildOpenApiDocument().components.schemas;
		// Major units on the seam, minor units everywhere else.
		expect(schemas.PosPrice.properties.amount.type).toBe('number');
		expect(schemas.AmountMinor.type).toBe('integer');
		// Slug, which PosSaleItem.product refers back to.
		expect(schemas.PosCatalogProduct.required).toContain('slug');
		// Catalog prices exclude VAT on both surfaces, so both publish the resolved rate.
		expect(schemas.PosCatalogProduct.required).toContain('vatRate');
		expect(schemas.CatalogProduct.properties.vatRate.type).toBe('number');
		// returnable is never emitted: returnables are flagged by tag.
		expect(Object.keys(schemas.PosCatalogProduct.properties)).not.toContain('returnable');
		// No order is flagged as belonging to a particular integration; what it does carry is what
		// a register needs to reconcile — the amount received and the VAT inside it.
		expect(Object.keys(schemas.PosPaidOrderEvent.properties)).toEqual([
			'orderId',
			'amount',
			'key',
			'vat'
		]);
		expect(schemas.PosPaidOrderEvent.required).toEqual(['orderId', 'amount']);
		// The seam reuses the shared picture schema.
		expect(schemas.PosImageData.allOf).toEqual([{ $ref: '#/components/schemas/CatalogPicture' }]);
	});

	it('documents the picture encoding and size parameters on every catalog read', () => {
		const paths = buildOpenApiDocument().paths as unknown as Record<
			string,
			Record<
				string,
				{ parameters?: Array<{ name: string; schema?: { enum?: string[]; pattern?: string } }> }
			>
		>;
		for (const path of [
			'/api/v1/catalog/products',
			'/api/v1/catalog/products/{id}',
			'/api/v1/catalog/products/{id}/picture',
			'/api/v1/pos/products'
		]) {
			const params = paths[path].get.parameters ?? [];
			expect(params.find((param) => param.name === 'picture')?.schema?.enum).toEqual([
				'url',
				'data-uri',
				'none'
			]);
			expect(params.find((param) => param.name === 'sizes')?.schema?.pattern).toBe(
				'^(all|[1-9][0-9]*)$'
			);
		}
	});

	it('documents conditional GETs (ETag / If-None-Match / 304) on reads only', () => {
		type LooseOperation = {
			parameters?: Array<{ name: string }>;
			responses: Record<string, { headers?: Record<string, unknown>; content?: unknown }>;
		};
		const paths = buildOpenApiDocument().paths as unknown as Record<
			string,
			Record<string, LooseOperation>
		>;
		for (const path of [
			'/api/v1/catalog/products',
			'/api/v1/catalog/products/{id}',
			'/api/v1/orders/paid'
		]) {
			const op = paths[path].get;
			expect(op.parameters?.some((param) => param.name === 'If-None-Match')).toBe(true);
			expect(op.responses['200'].headers?.ETag).toBeTruthy();
			expect(op.responses['304']).toBeTruthy();
			expect(op.responses['304'].headers?.ETag).toBeTruthy();
			expect(op.responses['304'].content).toBeUndefined();
		}
		// Writes stay on idempotency keys: no validator, no precondition.
		const post = paths['/api/v1/orders'].post;
		expect(post.responses['304']).toBeUndefined();
		expect(post.responses['200'].headers).toBeUndefined();
	});

	it('strongly recommends externalPaymentId on OrderPayment and shows it in example', () => {
		const doc = buildOpenApiDocument();
		const payment = doc.components.schemas.OrderPayment;
		expect(payment.properties.externalPaymentId.description).toMatch(/strongly recommended/i);
		const example =
			doc.paths['/api/v1/orders'].post.requestBody.content['application/json'].example;
		expect(example.orders[0].payments[0].externalPaymentId).toBeTruthy();
		expect(doc.components.schemas.ApiV1Warning.properties.code.enum).toContain(
			'PAYMENT_SYNC_FAILED'
		);
	});
});
