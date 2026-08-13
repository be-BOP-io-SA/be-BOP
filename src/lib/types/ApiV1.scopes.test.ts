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
		expect(orders?.scopes).toEqual(['orders:read', 'orders:write']);
		const catalog = groups.find((g) => g.category === 'catalog');
		expect(catalog?.scopes).toEqual(['catalog:read']);
	});
});
