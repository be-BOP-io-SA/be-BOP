import { describe, expect, it } from 'vitest';
import { binaryFindAround } from './binary-find';

describe('binaryFindAround', () => {
	it('should return undefined for both bounds when the array is empty', () => {
		const result = binaryFindAround([], 5, (a, b) => a - b);
		expect(result).toEqual([undefined, undefined]);
	});

	it('should return the same element for both bounds when the target is found', () => {
		const result = binaryFindAround([1, 2, 3], 2, (a, b) => a - b);
		expect(result).toEqual([2, 2]);
	});

	it('should return the correct bounds when the target is not found', () => {
		const result = binaryFindAround([1, 2, 4], 3, (a, b) => a - b);
		expect(result).toEqual([2, 4]);
	});

	it('should return the lower bound as undefined when the target is less than the first element', () => {
		const result = binaryFindAround([2, 3, 4], 1, (a, b) => a - b);
		expect(result).toEqual([undefined, 2]);
	});
});
