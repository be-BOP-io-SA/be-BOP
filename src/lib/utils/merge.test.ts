import { describe, expect, it } from 'vitest';
import { merge } from './merge';

describe('merge', () => {
	it('should merge two objects', () => {
		const obj1 = { a: 1, b: 2 };
		const obj2 = { b: 3, c: 4 };
		const result = merge(obj1, obj2);
		expect(result).toEqual({ a: 1, b: 3, c: 4 });
	});

	it('should merge nested objects', () => {
		const obj1 = { a: { b: 1 } };
		const obj2 = { a: { c: 2 } };
		const result = merge(obj1, obj2);
		expect(result).toEqual({ a: { b: 1, c: 2 } });
	});

	it('should handle empty objects', () => {
		const obj1 = {};
		const obj2 = { a: 1 };
		const result = merge(obj1, obj2);
		expect(result).toEqual({ a: 1 });
	});

	it('should handle undefined values', () => {
		const obj1 = { a: undefined };
		const obj2 = { a: 1 };
		const result = merge(obj1, obj2);
		expect(result).toEqual({ a: 1 });
	});
});
