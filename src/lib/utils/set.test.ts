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

	it('should skip an unclosed bracket', () => {
		const obj = {};
		set(obj, 'a[b.c', 1);
		expect(obj).toEqual({ a: { b: { c: 1 } } });
	});

	it('should not close a bracket across a line break', () => {
		const obj = {};
		set(obj, 'a[b\n.c]', 1);
		expect(obj).toEqual({ a: { 'b\n': { c: 1 } } });
	});

	it('should split a long run of unclosed brackets in linear time', () => {
		const obj = {};
		set(obj, `a${'['.repeat(500_000)}b`, 1);
		expect(obj).toEqual({ a: { b: 1 } });
	});

	it('should refuse an array index that would make the array huge and sparse', () => {
		expect(() => set({}, 'items[4294967294]', 1)).toThrow(RangeError);
		expect(() => set({}, 'items[4294967294].name', 1)).toThrow(RangeError);
	});

	it('should still accept a sparse but reasonable array index', () => {
		const obj = {};
		set(obj, 'items[3].name', 'x');
		expect((obj as { items: unknown[] }).items).toHaveLength(4);
	});

	it('should not treat a large numeric key on a plain object as an array index', () => {
		const obj = {};
		set(obj, '4294967294', 1);
		expect(obj).toEqual({ '4294967294': 1 });
	});
});
