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
});
