import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CUSTOMER_ROLE_ID } from '$lib/types/User';

const findOne = vi.fn();

vi.mock('$lib/server/database', () => ({
	collections: { products: { findOne: (...args: unknown[]) => findOne(...args) } }
}));
vi.mock('$lib/server/rateLimit', () => ({ rateLimit: vi.fn() }));
vi.mock('$lib/server/runtime-config', () => ({
	runtimeConfig: { priceHistoryEnabled: true }
}));
vi.mock('$lib/server/price-history', () => ({
	getProductPriceHistory: vi.fn(async () => ({
		currency: 'CHF',
		catalogue: { points: [], current: null, deltaPct: null, min30: null, max30: null },
		paid: { points: [], mean: null, pctBelowCatalogue: null }
	}))
}));

import { GET } from './+server';

type CallOpts = {
	id?: string;
	csv?: boolean;
	user?: { roleId: string; hasPosOptions?: boolean };
};

function call(opts: CallOpts = {}) {
	const id = opts.id ?? 'prod';
	return GET({
		params: { id },
		locals: { clientIp: '1.2.3.4', user: opts.user },
		url: new URL(`http://x/product/${id}/price-history${opts.csv ? '?format=csv' : ''}`)
	} as unknown as Parameters<typeof GET>[0]) as Promise<Response>;
}

/** Resolve to the thrown HttpError status, or 'ok' if it returned a Response. */
async function statusOf(p: Promise<Response>): Promise<number | 'ok'> {
	try {
		await p;
		return 'ok';
	} catch (e) {
		return (e as { status: number }).status;
	}
}

const PUBLIC_PRODUCT = { price: { currency: 'CHF' } };

describe('GET /product/[id]/price-history', () => {
	beforeEach(() => {
		findOne.mockReset();
	});

	it('404s when the product does not exist', async () => {
		findOne.mockResolvedValue(null);
		expect(await statusOf(call())).toBe(404);
	});

	it.each(['payWhatYouWant', 'free', 'bookingSpec'])(
		'404s for a %s product (no fixed catalogue price)',
		async (flag) => {
			findOne.mockResolvedValue({ ...PUBLIC_PRODUCT, [flag]: flag === 'bookingSpec' ? {} : true });
			expect(await statusOf(call())).toBe(404);
		}
	);

	it('returns JSON for a normal product', async () => {
		findOne.mockResolvedValue(PUBLIC_PRODUCT);
		const res = await call();
		expect(res.status).toBe(200);
		expect(res.headers.get('content-type')).toContain('application/json');
	});

	it('forbids CSV export for an anonymous visitor', async () => {
		findOne.mockResolvedValue(PUBLIC_PRODUCT);
		expect(await statusOf(call({ csv: true }))).toBe(403);
	});

	it('forbids CSV export for a plain customer', async () => {
		findOne.mockResolvedValue(PUBLIC_PRODUCT);
		expect(await statusOf(call({ csv: true, user: { roleId: CUSTOMER_ROLE_ID } }))).toBe(403);
	});

	it('allows CSV export for staff (non-customer role)', async () => {
		findOne.mockResolvedValue(PUBLIC_PRODUCT);
		const res = await call({ csv: true, user: { roleId: 'admin' } });
		expect(res.status).toBe(200);
		expect(res.headers.get('content-type')).toContain('text/csv');
		expect(res.headers.get('content-disposition')).toContain('attachment');
	});
});
