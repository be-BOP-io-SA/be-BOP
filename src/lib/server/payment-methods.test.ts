import { describe, expect, it } from 'vitest';
import { restrictToProducts } from './payment-methods';

describe('restrictToProducts', () => {
	const methods = ['card', 'lightning', 'bitcoin'] as const;

	it('leaves the methods alone when no product is restricted', () => {
		expect(restrictToProducts([...methods], [{}, {}])).toEqual(methods);
	});

	it('keeps only what every restricted product accepts', () => {
		expect(
			restrictToProducts(
				[...methods],
				[
					{ paymentMethods: ['card', 'lightning'] },
					{},
					{ paymentMethods: ['lightning', 'bitcoin'] }
				]
			)
		).toEqual(['lightning']);
	});

	it('returns nothing when the restrictions do not overlap', () => {
		expect(
			restrictToProducts(
				[...methods],
				[{ paymentMethods: ['card'] }, { paymentMethods: ['bitcoin'] }]
			)
		).toEqual([]);
	});
});
