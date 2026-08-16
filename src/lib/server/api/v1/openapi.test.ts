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
