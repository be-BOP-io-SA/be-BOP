import { describe, expect, it } from 'vitest';
import { groupBy } from './group-by';

describe('groupBy', () => {
	it('should group by a key', () => {
		const data = [
			{ id: 1, category: 'A' },
			{ id: 2, category: 'B' },
			{ id: 3, category: 'A' }
		];
		const result = groupBy(data, (item) => item.category);
		expect(result).toEqual({
			A: [
				{ id: 1, category: 'A' },
				{ id: 3, category: 'A' }
			],
			B: [{ id: 2, category: 'B' }]
		});
	});
});
