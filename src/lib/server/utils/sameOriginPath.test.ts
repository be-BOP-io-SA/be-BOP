import { describe, expect, it } from 'vitest';
import { sameOriginPath } from './sameOriginPath';

const origin = 'https://shop.example';

describe('sameOriginPath', () => {
	it.each([
		['/product/tea', '/product/tea'],
		['/product/tea?x=1#top', '/product/tea?x=1#top'],
		['https://shop.example/cart', '/cart']
	])('keeps %s on the shop', (target, expected) => {
		expect(sameOriginPath(target, origin)).toBe(expected);
	});

	it.each([
		'//other.example',
		'/\\other.example',
		'/\t/other.example',
		'/\n/other.example',
		'/\r/other.example',
		'https://other.example/',
		'javascript:alert(1)'
	])('refuses %j', (target) => {
		expect(sameOriginPath(target, origin)).toBeUndefined();
	});
});
