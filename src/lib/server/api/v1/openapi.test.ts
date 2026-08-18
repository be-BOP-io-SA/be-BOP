import { describe, expect, it } from 'vitest';
import { buildOpenApiDocument } from './openapi';

/**
 * Asserting a path is *absent* means indexing with a key the literal type does not have, which
 * svelte-check rejects. Widen to a record for those lookups only.
 */
function documentedPaths(doc: ReturnType<typeof buildOpenApiDocument>): Record<string, unknown> {
	return doc.paths as unknown as Record<string, unknown>;
}

describe('buildOpenApiDocument', () => {
	it('returns OpenAPI 3 document with openapi field and core paths', () => {
		const doc = buildOpenApiDocument({ serverUrl: 'https://shop.example' });
		expect(doc.openapi).toMatch(/^3\./);
		expect(doc.info.version).toBe('v1');
		expect(doc.paths['/api/v1/health']).toBeTruthy();
		expect(doc.paths['/api/v1/orders']).toBeTruthy();
		expect(documentedPaths(doc)['/api/v1/catalog/products']).toBeUndefined();
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

	it('does not document catalog stub or catalog:read scope', () => {
		const doc = buildOpenApiDocument();
		expect(doc.tags.some((t) => t.name === 'catalog')).toBe(false);
		expect(documentedPaths(doc)['/api/v1/catalog/products']).toBeUndefined();
		expect(doc.info.description).not.toMatch(/catalog:read/);
		expect(doc.components.securitySchemes.BearerAuth.description).toMatch(/orders:write/);
		expect(doc.components.securitySchemes.BearerAuth.description).not.toMatch(/catalog:read/);
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
