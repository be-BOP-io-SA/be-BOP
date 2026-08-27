import { describe, expect, it } from 'vitest';
import { API_V1_SCOPES, groupScopesByCategory, scopeCategory } from './ApiV1';

describe('scopeCategory / groupScopesByCategory', () => {
	it('takes the resource prefix before the colon', () => {
		expect(scopeCategory('orders:read')).toBe('orders');
		expect(scopeCategory('orders:write')).toBe('orders');
		expect(scopeCategory('catalog:read')).toBe('catalog');
	});

	it('puts orders:read and orders:write in the same orders group', () => {
		const groups = groupScopesByCategory(API_V1_SCOPES);
		const orders = groups.find((g) => g.category === 'orders');
		expect(orders?.scopes).toEqual(['orders:read', 'orders:stream', 'orders:write']);
		const catalog = groups.find((g) => g.category === 'catalog');
		expect(catalog?.scopes).toEqual(['catalog:read']);
	});

	it('gives the PoS seam its own category, so a till key can be issued on its own', () => {
		const pos = groupScopesByCategory(API_V1_SCOPES).find((g) => g.category === 'pos');
		expect(pos?.scopes).toEqual(['pos:read', 'pos:stream', 'pos:write']);
	});

	it('separates streaming from reading on both surfaces', () => {
		// Holding a connection open is a different privilege from reading a page.
		expect(API_V1_SCOPES).toContain('orders:stream');
		expect(API_V1_SCOPES).toContain('pos:stream');
	});

	it('keeps pos scopes independent of the general ones', () => {
		// Neither implies the other: a till credential must not unlock GET /api/v1/orders.
		expect(API_V1_SCOPES).toContain('pos:read');
		expect(API_V1_SCOPES).toContain('orders:read');
		expect(scopeCategory('pos:read')).not.toBe(scopeCategory('orders:read'));
	});
});
