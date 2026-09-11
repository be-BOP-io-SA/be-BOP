import { afterEach, describe, expect, it, vi } from 'vitest';
import { posSalesRequestSchema, type PosSale } from './schemas';

const NOW = new Date('2026-08-27T12:00:00.000Z');
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function at(offsetMs: number): string {
	return new Date(NOW.getTime() + offsetMs).toISOString();
}

function sale(overrides?: Record<string, unknown>): unknown {
	return {
		externalOrderId: 'sale-1',
		soldAt: at(0),
		method: 'cashless',
		totalPrice: { amount: 12.5, currency: 'CHF' },
		items: [{ product: 'tartiflette', quantity: 1, price: { amount: 12.5, currency: 'CHF' } }],
		...overrides
	};
}

function line(overrides?: Record<string, unknown>): unknown {
	return {
		product: 'tartiflette',
		quantity: 1,
		price: { amount: 1, currency: 'CHF' },
		...overrides
	};
}

function parse(body: unknown) {
	return posSalesRequestSchema.safeParse(body);
}

function accepts(body: unknown): boolean {
	return parse(body).success;
}

/** Every issue path, joined — the route reports the first one as `field`. */
function issuePaths(body: unknown): string[] {
	const parsed = parse(body);
	return parsed.success ? [] : parsed.error.issues.map((issue) => issue.path.join('.'));
}

function firstIssuePath(body: unknown): string | null {
	return issuePaths(body)[0] ?? null;
}

describe('posSalesRequestSchema', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	describe('batch envelope', () => {
		it('accepts a well-formed batch', () => {
			expect(accepts([sale()])).toBe(true);
		});

		it('is a bare array, not an object wrapping one', () => {
			expect(accepts({ orders: [sale()] })).toBe(false);
			expect(accepts({ sales: [sale()] })).toBe(false);
		});

		it('rejects an empty batch', () => {
			expect(accepts([])).toBe(false);
		});

		it('accepts 100 sales and rejects 101', () => {
			expect(accepts(Array.from({ length: 100 }, () => sale()))).toBe(true);
			expect(accepts(Array.from({ length: 101 }, () => sale()))).toBe(false);
		});

		it('rejects a key the schema does not know, rather than ignoring it', () => {
			expect(firstIssuePath([{ ...(sale() as object), tip: 2 }])).toBe('0');
		});

		it('reports the index of the offending sale, not just the batch', () => {
			expect(firstIssuePath([sale(), sale({ method: '' })])).toBe('1.method');
		});
	});

	describe('required fields', () => {
		it.each(['externalOrderId', 'soldAt', 'method', 'totalPrice', 'items'])(
			'names %s when it is missing',
			(field) => {
				const body = sale() as Record<string, unknown>;
				delete body[field];
				expect(firstIssuePath([body])).toBe(`0.${field}`);
			}
		);
	});

	describe('externalOrderId', () => {
		it('is trimmed, so surrounding whitespace cannot fork the idempotency key', () => {
			const parsed = parse([sale({ externalOrderId: '  sale-1  ' })]);
			expect(parsed.success && (parsed.data[0] as PosSale).externalOrderId).toBe('sale-1');
		});

		it('rejects an empty or whitespace-only reference', () => {
			expect(accepts([sale({ externalOrderId: '' })])).toBe(false);
			expect(accepts([sale({ externalOrderId: '   ' })])).toBe(false);
		});

		it('accepts 200 characters and rejects 201', () => {
			expect(accepts([sale({ externalOrderId: 'a'.repeat(200) })])).toBe(true);
			expect(accepts([sale({ externalOrderId: 'a'.repeat(201) })])).toBe(false);
		});
	});

	describe('method', () => {
		it('takes any subtype slug the shop configured, not a fixed vocabulary', () => {
			for (const method of ['cashless', 'wristband', 'locker', 'carte-cadeau']) {
				expect(accepts([sale({ method })])).toBe(true);
			}
		});

		it('rejects an empty or whitespace-only slug', () => {
			expect(firstIssuePath([sale({ method: '' })])).toBe('0.method');
			expect(firstIssuePath([sale({ method: '   ' })])).toBe('0.method');
		});

		it('is trimmed, so the subtype resolves against the configured slug', () => {
			const parsed = parse([sale({ method: '  cashless  ' })]);
			expect(parsed.success && (parsed.data[0] as PosSale).method).toBe('cashless');
		});

		it('rejects a slug over 200 characters', () => {
			expect(accepts([sale({ method: 'a'.repeat(201) })])).toBe(false);
		});
	});

	describe('items', () => {
		it('requires at least one line', () => {
			expect(firstIssuePath([sale({ items: [] })])).toBe('0.items');
		});

		it('accepts 500 lines and rejects 501', () => {
			expect(accepts([sale({ items: Array.from({ length: 500 }, () => line()) })])).toBe(true);
			expect(accepts([sale({ items: Array.from({ length: 501 }, () => line()) })])).toBe(false);
		});

		it('rejects a quantity that is not a positive integer', () => {
			for (const quantity of [0, -1, 1.5]) {
				expect(firstIssuePath([sale({ items: [line({ quantity })] })])).toBe('0.items.0.quantity');
			}
		});

		it('accepts a million units and rejects more', () => {
			expect(accepts([sale({ items: [line({ quantity: 1_000_000 })] })])).toBe(true);
			expect(accepts([sale({ items: [line({ quantity: 1_000_001 })] })])).toBe(false);
		});

		it('rejects an empty product slug', () => {
			expect(firstIssuePath([sale({ items: [line({ product: '' })] })])).toBe('0.items.0.product');
		});

		it('names the offending line, not the first', () => {
			expect(firstIssuePath([sale({ items: [line(), line(), line({ quantity: 0 })] })])).toBe(
				'0.items.2.quantity'
			);
		});
	});

	describe('prices', () => {
		it('accepts a decimal amount — these are major units, not minor', () => {
			expect(accepts([sale({ totalPrice: { amount: 12.5, currency: 'CHF' } })])).toBe(true);
		});

		it('rejects zero and negative amounts', () => {
			for (const amount of [0, -1]) {
				expect(firstIssuePath([sale({ totalPrice: { amount, currency: 'CHF' } })])).toBe(
					'0.totalPrice.amount'
				);
			}
		});

		it('accepts any be-BOP currency, not only the seam CHF', () => {
			expect(
				accepts([
					sale({
						totalPrice: { amount: 1, currency: 'EUR' },
						items: [line({ price: { amount: 1, currency: 'EUR' } })]
					})
				])
			).toBe(true);
		});

		it('rejects a currency be-BOP does not know', () => {
			expect(accepts([sale({ totalPrice: { amount: 1, currency: 'chf' } })])).toBe(false);
		});

		it('rejects a price carrying the storage precision field', () => {
			expect(accepts([sale({ totalPrice: { amount: 1, currency: 'CHF', precision: 8 } })])).toBe(
				false
			);
		});

		it('requires every line to match the total currency', () => {
			expect(
				firstIssuePath([
					sale({
						totalPrice: { amount: 2, currency: 'CHF' },
						items: [line(), line({ price: { amount: 1, currency: 'EUR' } })]
					})
				])
			).toBe('0.items.1.price.currency');
		});

		it('reports one issue per mismatched line, not two for the first', () => {
			expect(
				issuePaths([
					sale({
						totalPrice: { amount: 1, currency: 'CHF' },
						items: [line({ price: { amount: 1, currency: 'EUR' } })]
					})
				])
			).toEqual(['0.items.0.price.currency']);
		});

		it('does not check that the lines add up to the total', () => {
			// Deliberate: discounts, rounding and PWYW all break the sum, and the write path reports
			// a divergence as AMOUNT_MISMATCH rather than refusing the sale.
			expect(
				accepts([sale({ totalPrice: { amount: 999, currency: 'CHF' }, items: [line()] })])
			).toBe(true);
		});
	});

	describe('soldAt format', () => {
		it('requires an offset, so the instant is unambiguous', () => {
			expect(firstIssuePath([sale({ soldAt: '2026-08-27T12:00:00' })])).toBe('0.soldAt');
		});

		it('accepts Z and an explicit offset alike', () => {
			expect(accepts([sale({ soldAt: '2026-08-27T12:00:00Z' })])).toBe(true);
			expect(accepts([sale({ soldAt: '2026-08-27T14:00:00+02:00' })])).toBe(true);
		});

		it('accepts fractional seconds', () => {
			expect(accepts([sale({ soldAt: '2026-08-27T12:00:00.123Z' })])).toBe(true);
		});

		it('rejects a date-only value or free text', () => {
			expect(accepts([sale({ soldAt: '2026-08-27' })])).toBe(false);
			expect(accepts([sale({ soldAt: 'yesterday' })])).toBe(false);
			expect(accepts([sale({ soldAt: '' })])).toBe(false);
		});

		it('rejects a non-string', () => {
			expect(accepts([sale({ soldAt: NOW.getTime() })])).toBe(false);
		});
	});

	describe('soldAt bounds', () => {
		it('accepts a sale from years ago — a late batch is legitimate', () => {
			vi.useFakeTimers({ now: NOW });
			expect(accepts([sale({ soldAt: at(-3 * 365 * DAY) })])).toBe(true);
		});

		it('accepts the current instant', () => {
			vi.useFakeTimers({ now: NOW });
			expect(accepts([sale({ soldAt: at(0) })])).toBe(true);
		});

		it('accepts an hour ahead, which a daylight-saving shift produces', () => {
			vi.useFakeTimers({ now: NOW });
			expect(accepts([sale({ soldAt: at(HOUR) })])).toBe(true);
		});

		it('accepts 14 hours ahead — the largest timezone misconfiguration possible', () => {
			vi.useFakeTimers({ now: NOW });
			expect(accepts([sale({ soldAt: at(14 * HOUR) })])).toBe(true);
		});

		it('accepts exactly 24 hours ahead, and rejects a millisecond past it', () => {
			vi.useFakeTimers({ now: NOW });
			expect(accepts([sale({ soldAt: at(DAY) })])).toBe(true);
			expect(accepts([sale({ soldAt: at(DAY + 1) })])).toBe(false);
		});

		it('rejects a sale a day and a half ahead — that is a bug, not a late batch', () => {
			vi.useFakeTimers({ now: NOW });
			expect(firstIssuePath([sale({ soldAt: at(36 * HOUR) })])).toBe('0.soldAt');
		});

		it('judges the instant, not the wall clock, across a DST boundary', () => {
			// 2026-03-29 is the European spring-forward. 02:30+01:00 and 03:30+02:00 are the same
			// instant; the bound must treat them identically whatever the offset written.
			vi.useFakeTimers({ now: new Date('2026-03-29T02:00:00Z') });
			expect(accepts([sale({ soldAt: '2026-03-29T02:30:00+01:00' })])).toBe(true);
			expect(accepts([sale({ soldAt: '2026-03-29T03:30:00+02:00' })])).toBe(true);
		});

		it('does not let a negative offset smuggle a far-future instant past the bound', () => {
			vi.useFakeTimers({ now: NOW });
			// Wall clock reads yesterday, but -12:00 puts the instant two days ahead.
			expect(accepts([sale({ soldAt: '2026-08-28T18:00:00-12:00' })])).toBe(false);
		});

		it('names soldAt on the offending sale within a mixed batch', () => {
			vi.useFakeTimers({ now: NOW });
			expect(firstIssuePath([sale(), sale({ soldAt: at(2 * DAY) })])).toBe('1.soldAt');
		});

		it('applies the bound per sale, so one bad date fails the batch', () => {
			vi.useFakeTimers({ now: NOW });
			expect(accepts([sale(), sale({ soldAt: at(2 * DAY) }), sale()])).toBe(false);
		});
	});
});
