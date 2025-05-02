import { describe, expect, it } from 'vitest';
import { set } from './set';

describe('set', () => {
	it('should set a value in a nested object', () => {
		const obj = { a: { b: { c: 1 } } };
		set(obj, 'a.b.c', 2);
		expect(obj).toEqual({ a: { b: { c: 2 } } });
	});

	it('should create nested objects if they do not exist', () => {
		const obj = {};
		set(obj, 'a.b.c', 1);
		expect(obj).toEqual({ a: { b: { c: 1 } } });
	});

	it('should set a value in an array', () => {
		const obj = { a: { b: [1, 2, 3] } };
		set(obj, 'a.b[1]', 4);
		expect(obj).toEqual({ a: { b: [1, 4, 3] } });
	});

	it('should push a value to an array without specifying index', () => {
		const obj = { a: { b: [1, 2, 3] } };
		set(obj, 'a.b[]', 4);
		expect(obj).toEqual({ a: { b: [1, 2, 3, 4] } });
	});

	it('should push a value to an array with  specifying index', () => {
		const obj = { a: { b: [1, 2, 3] } };
		set(obj, 'a.b[3]', 4);
		expect(obj).toEqual({ a: { b: [1, 2, 3, 4] } });
	});

	it("should create an array if it doesn't exist", () => {
		const obj = { a: {} };
		set(obj, 'a.b[0]', 1);
		expect(obj).toEqual({ a: { b: [1] } });
	});

	it('should handle space in key', () => {
		const obj = { a: { b: { c: 1 } } };
		set(obj, 'a.b[c d]', 2);
		expect(obj).toEqual({ a: { b: { c: 1, 'c d': 2 } } });
	});

	it('should handle special characters in key', () => {
		const obj = { a: { b: { c: 1 } } };
		set(obj, 'a.b[c@d]', 3);
		expect(obj).toEqual({ a: { b: { c: 1, 'c@d': 3 } } });
	});

	it('should work with [abc.]', () => {
		const obj = { a: { b: { c: 1 } } };
		set(obj, 'a.b[abc.]', 3);
		expect(obj).toEqual({ a: { b: { c: 1, 'abc.': 3 } } });
	});

	it('should work with cta[0].label', () => {
		const obj = {};
		set(obj, 'cta[0].label', 'test');
		expect(obj).toEqual({ cta: [{ label: 'test' }] });
	});
});
