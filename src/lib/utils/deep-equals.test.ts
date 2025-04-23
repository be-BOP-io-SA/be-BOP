import { describe, expect, it } from 'vitest';
import { deepEquals } from './deep-equals';

describe('deepEquals', () => {
	it('should work with strings', () => {
		expect(deepEquals('test', 'test')).toBe(true);
		expect(deepEquals('test', 'TEST')).toBe(false);
	});

	it('should work with numbers', () => {
		expect(deepEquals(1, 1)).toBe(true);
		expect(deepEquals(1, 2)).toBe(false);
	});

	it('should work with booleans', () => {
		expect(deepEquals(true, true)).toBe(true);
		expect(deepEquals(true, false)).toBe(false);
	});

	it('should work with null and undefined', () => {
		expect(deepEquals(null, null)).toBe(true);
		expect(deepEquals(null, undefined)).toBe(false);
		expect(deepEquals(undefined, undefined)).toBe(true);
	});

	it('should work with arrays', () => {
		expect(deepEquals([1, 2, 3], [1, 2, 3])).toBe(true);
		expect(deepEquals([1, 2, 3], [1, 2])).toBe(false);
		expect(deepEquals([1, 2, 3], [1, 2, 3, 4])).toBe(false);
		expect(deepEquals([1, 2, 3], [3, 2, 1])).toBe(false);
		expect(deepEquals([1, null], [1, null])).toBe(true);
		expect(deepEquals([null], [undefined])).toBe(false);
		expect(deepEquals([], [])).toBe(true);
		expect(deepEquals([], [null])).toBe(false);
	});

	it('should work with objects', () => {
		expect(deepEquals({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
		expect(deepEquals({ a: 1, b: 2 }, { a: 1 })).toBe(false);
		expect(deepEquals({ a: 1, b: 2 }, { a: 1, b: 2, c: 3 })).toBe(false);
		expect(deepEquals({ a: 1, b: null }, { a: 1, b: null })).toBe(true);
		expect(deepEquals({ a: null }, { a: undefined })).toBe(false);
		expect(deepEquals({}, {})).toBe(true);
		expect(deepEquals({}, { a: null })).toBe(false);
	});

	it('should work with nested objects', () => {
		expect(deepEquals({ a: { b: 1 } }, { a: { b: 1 } })).toBe(true);
		expect(deepEquals({ a: { b: 1 } }, { a: { b: 2 } })).toBe(false);
		expect(deepEquals({ a: { b: 1 } }, { a: { c: 1 } })).toBe(false);
		expect(deepEquals({ a: { b: null } }, { a: { b: null } })).toBe(true);
		expect(deepEquals({ a: { b: null } }, { a: { b: undefined } })).toBe(false);
	});

	it('should work with complex objects', () => {
		const obj1 = {
			a: 1,
			b: [1, 2, { c: 3 }],
			d: { e: 4 }
		};
		const obj2 = {
			a: 1,
			b: [1, 2, { c: 3 }],
			d: { e: 4 }
		};
		expect(deepEquals(obj1, obj2)).toBe(true);
		expect(deepEquals(obj1, { ...obj2, d: { e: 5 } })).toBe(false);
		expect(deepEquals(obj1, { ...obj2, b: [1, 2] })).toBe(false);
	});
});
