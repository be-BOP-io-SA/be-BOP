import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Force the feature flag on for the whole file: env-config freezes the flag at import time, so
// we spread the real module and override only ALLOW_PAID_ORDER_WEBHOOK (every other consumer —
// ./database etc. — keeps the real values).
vi.mock('./env-config', async (importOriginal) => {
	const actual = await importOriginal<typeof import('./env-config')>();
	return { ...actual, ALLOW_PAID_ORDER_WEBHOOK: 'true' };
});

// Stub DNS so hostname targets resolve to a public IP (203.0.113.10 = TEST-NET-3, non-private)
// without hitting the network; individual tests override with mockResolvedValueOnce.
vi.mock('dns/promises', () => ({
	lookup: vi.fn(async () => [{ address: '203.0.113.10', family: 4 }])
}));

import { createHmac } from 'crypto';
import { lookup } from 'dns/promises';
import { cleanDb } from './test-utils';
import { collections } from './database';
import { firePaidOrderWebhooks, stripPaidOrderWebhook } from './order-paid-webhook';
import { assertPublicWebhookTarget, isPrivateIp, webhookApiRouteIssue } from './webhook-url-guard';
import type { Order } from '$lib/types/Order';
import type { Product } from '$lib/types/Product';

function makeOrder(
	items: Array<{ product: { _id: string } }>,
	overrides: Partial<Order> = {}
): Order {
	return {
		_id: 'ord_4242',
		number: 4242,
		items,
		notifications: { paymentStatus: { email: 'buyer@example.com', npub: null } },
		customCheckoutFields: [],
		...overrides
	} as unknown as Order;
}

/** Priced line: `amount` is the per-unit snapshot, as stored on a real order. */
function line(
	productId: string,
	opts: {
		amount?: number;
		quantity?: number;
		uniqueKey?: string;
		customPrice?: number;
		discountPercentage?: number;
		freeQuantity?: number;
	} = {}
) {
	const price = { amount: opts.amount ?? 100, currency: 'EUR' };
	return {
		product: { _id: productId },
		quantity: opts.quantity ?? 1,
		...(opts.uniqueKey && { uniqueKey: opts.uniqueKey }),
		...(opts.discountPercentage && { discountPercentage: opts.discountPercentage }),
		...(opts.freeQuantity && { freeQuantity: opts.freeQuantity }),
		currencySnapshot: {
			main: {
				price,
				...(opts.customPrice !== undefined && {
					customPrice: { amount: opts.customPrice, currency: 'EUR' }
				})
			}
		}
	};
}

async function insertWebhookProduct(id: string, apiRoute: string, secret: string) {
	await collections.products.insertOne({
		_id: id,
		paidOrderWebhook: { apiRoute, secret }
	} as unknown as Product);
}

describe('stripPaidOrderWebhook', () => {
	it('removes paidOrderWebhook while preserving every other field', () => {
		const product = {
			_id: 'p1',
			name: 'Widget',
			paidOrderWebhook: { apiRoute: 'https://x.test/hook', secret: 's3cr3t' }
		} as unknown as Product;

		const stripped = stripPaidOrderWebhook(product);

		expect(stripped).not.toHaveProperty('paidOrderWebhook');
		expect(stripped._id).toBe('p1');
		expect((stripped as { name: string }).name).toBe('Widget');
	});

	it('does not mutate the input product', () => {
		const product = {
			_id: 'p1',
			paidOrderWebhook: { apiRoute: 'https://x.test/hook', secret: 's3cr3t' }
		} as unknown as Product;

		stripPaidOrderWebhook(product);

		expect(product.paidOrderWebhook).toEqual({ apiRoute: 'https://x.test/hook', secret: 's3cr3t' });
	});

	it('returns the same object untouched when there is no webhook', () => {
		const product = { _id: 'p1', name: 'Widget' } as unknown as Product;
		expect(stripPaidOrderWebhook(product)).toBe(product);
	});
});

describe('webhook-url-guard', () => {
	it('isPrivateIp flags private / loopback / link-local / metadata addresses', () => {
		for (const ip of [
			'127.0.0.1',
			'10.0.0.5',
			'172.16.0.1',
			'192.168.1.1',
			'169.254.169.254',
			'100.64.0.1',
			'::1',
			'fe80::1',
			'fd00::1',
			'::ffff:127.0.0.1'
		]) {
			expect(isPrivateIp(ip), ip).toBe(true);
		}
		for (const ip of ['93.184.216.34', '8.8.8.8', '203.0.113.10', '2606:4700::1111']) {
			expect(isPrivateIp(ip), ip).toBe(false);
		}
	});

	it('webhookApiRouteIssue rejects non-https, localhost and private literal IPs', () => {
		expect(webhookApiRouteIssue('http://example.com/hook')).toMatch(/https/);
		expect(webhookApiRouteIssue('https://localhost/hook')).toMatch(/localhost|internal/);
		expect(webhookApiRouteIssue('https://foo.local/hook')).toMatch(/localhost|internal/);
		expect(webhookApiRouteIssue('https://127.0.0.1/hook')).toMatch(/private|loopback/);
		expect(webhookApiRouteIssue('https://169.254.169.254/latest/meta-data')).toMatch(
			/private|loopback/
		);
		expect(webhookApiRouteIssue('https://[::1]/hook')).toMatch(/private|loopback/);
		expect(webhookApiRouteIssue('not a url')).toBe('Invalid URL');
	});

	it('webhookApiRouteIssue accepts a public https URL', () => {
		expect(webhookApiRouteIssue('https://receiver.example.com/webhooks/order-paid')).toBeNull();
	});

	it('assertPublicWebhookTarget rejects a hostname that resolves to a private address (DNS rebinding)', async () => {
		// dns.lookup is overloaded; the { all: true } form returns LookupAddress[] but vi.mocked
		// resolves the single-address overload, so cast the array through `never`.
		vi.mocked(lookup).mockResolvedValueOnce([{ address: '10.0.0.9', family: 4 }] as never);
		await expect(assertPublicWebhookTarget('https://rebind.example.com/hook')).rejects.toThrow(
			/private address/
		);
	});

	it('assertPublicWebhookTarget resolves for a public host', async () => {
		await expect(
			assertPublicWebhookTarget('https://receiver.example.com/hook')
		).resolves.toBeUndefined();
	});
});

describe('firePaidOrderWebhooks', () => {
	let fetchMock: ReturnType<typeof vi.fn>;

	beforeEach(async () => {
		await cleanDb();
		fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
		vi.stubGlobal('fetch', fetchMock);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('POSTs a correctly HMAC-signed payload to the live product endpoint', async () => {
		const secret = 'super-secret-key';
		await insertWebhookProduct('wh-product', 'https://receiver.test/hook', secret);

		await firePaidOrderWebhooks(
			makeOrder([{ product: { _id: 'wh-product' } }], {
				billingAddress: { firstName: 'Jane', country: 'FR' },
				customCheckoutFields: [{ slug: 'company', label: 'Company', value: 'Acme' }]
			} as unknown as Partial<Order>)
		);

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, opts] = fetchMock.mock.calls[0];
		expect(url).toBe('https://receiver.test/hook');
		expect(opts.method).toBe('POST');
		expect(opts.redirect).toBe('error');
		expect(opts.headers['Content-Type']).toBe('application/json');

		// Signature must be HMAC-SHA256(secret, rawBody) — the exact contract the receiver verifies.
		const expected = 'sha256=' + createHmac('sha256', secret).update(opts.body).digest('hex');
		expect(opts.headers['X-Webhook-Signature']).toBe(expected);

		const payload = JSON.parse(opts.body);
		expect(payload.orderId).toBe('ord_4242');
		expect(payload.orderNumber).toBe(4242);
		expect(payload.contact).toEqual({ email: 'buyer@example.com', npub: null });
		expect(payload.billingAddress).toEqual({ firstName: 'Jane', country: 'FR' });
		expect(payload.customCheckoutFields).toEqual([
			{ slug: 'company', label: 'Company', value: 'Acme' }
		]);
	});

	it('reports each line with its uniqueKey and the amount actually paid', async () => {
		await insertWebhookProduct('wh-product', 'https://receiver.test/hook', 'k');

		await firePaidOrderWebhooks(
			makeOrder([
				line('wh-product', { uniqueKey: 'kfdjsfeaz12845ND9xezj91820', amount: 30 }),
				line('wh-product', { amount: 30, quantity: 2 })
			])
		);

		const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
		expect(payload.items).toEqual([
			{
				productId: 'wh-product',
				quantity: 1,
				uniqueKey: 'kfdjsfeaz12845ND9xezj91820',
				amountPaid: { amount: 30, currency: 'EUR' }
			},
			{ productId: 'wh-product', quantity: 2, amountPaid: { amount: 60, currency: 'EUR' } }
		]);
	});

	it('prices a line from what was charged: PWYW / variation, discount and free units', async () => {
		await insertWebhookProduct('wh-product', 'https://receiver.test/hook', 'k');

		await firePaidOrderWebhooks(
			makeOrder([
				// PWYW or variation surcharge lands in customPrice, not the catalogue price.
				line('wh-product', { amount: 10, customPrice: 42 }),
				// 3 units, 1 offered, 50% off the rest -> 2 * 100 * 0.5
				line('wh-product', { amount: 100, quantity: 3, freeQuantity: 1, discountPercentage: 50 })
			])
		);

		const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
		expect(payload.items[0].amountPaid).toEqual({ amount: 42, currency: 'EUR' });
		expect(payload.items[1].amountPaid).toEqual({ amount: 100, currency: 'EUR' });
	});

	it('scopes items to the receiving product — a shared basket never leaks other sellers lines', async () => {
		await insertWebhookProduct('seller-a', 'https://a.test/hook', 'ka');
		await insertWebhookProduct('seller-b', 'https://b.test/hook', 'kb');

		await firePaidOrderWebhooks(
			makeOrder([
				line('seller-a', { uniqueKey: 'key-a' }),
				line('seller-b', { uniqueKey: 'key-b' })
			])
		);

		expect(fetchMock).toHaveBeenCalledTimes(2);
		for (const [url, opts] of fetchMock.mock.calls) {
			const payload = JSON.parse(opts.body);
			const mine = url === 'https://a.test/hook' ? 'seller-a' : 'seller-b';
			const theirs = mine === 'seller-a' ? 'seller-b' : 'seller-a';
			expect(payload.items.map((i: { productId: string }) => i.productId)).toEqual([mine]);
			expect(opts.body).not.toContain(theirs);
		}
	});

	it('omits amountPaid rather than throwing when a line has no currency snapshot', async () => {
		await insertWebhookProduct('wh-product', 'https://receiver.test/hook', 'k');

		await expect(
			firePaidOrderWebhooks(makeOrder([{ product: { _id: 'wh-product' } }]))
		).resolves.toBeUndefined();

		const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
		expect(payload.items).toEqual([{ productId: 'wh-product' }]);
	});

	it('never sends the secret in the payload or reads the order snapshot', async () => {
		const secret = 'do-not-leak';
		await insertWebhookProduct('wh-product', 'https://receiver.test/hook', secret);

		await firePaidOrderWebhooks(makeOrder([{ product: { _id: 'wh-product' } }]));

		const body = fetchMock.mock.calls[0][1].body;
		expect(body).not.toContain(secret);
	});

	it('does not fire for products without a webhook configured', async () => {
		await collections.products.insertOne({ _id: 'plain' } as unknown as Product);

		await firePaidOrderWebhooks(makeOrder([{ product: { _id: 'plain' } }]));

		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('skips an unsafe target (SSRF guard) without firing — e.g. a legacy http/localhost hook', async () => {
		await insertWebhookProduct('wh-product', 'http://localhost:8080/hook', 'legacy-secret-1234');

		await firePaidOrderWebhooks(makeOrder([{ product: { _id: 'wh-product' } }]));

		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('fires once per distinct product even when it appears in several line items', async () => {
		await insertWebhookProduct('wh-product', 'https://receiver.test/hook', 'k');

		await firePaidOrderWebhooks(
			makeOrder([{ product: { _id: 'wh-product' } }, { product: { _id: 'wh-product' } }])
		);

		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('is fire-and-forget: a rejected fetch does not throw', async () => {
		fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
		await insertWebhookProduct('wh-product', 'https://receiver.test/hook', 'k');

		await expect(
			firePaidOrderWebhooks(makeOrder([{ product: { _id: 'wh-product' } }]))
		).resolves.toBeUndefined();
	});

	it('is fire-and-forget: a non-2xx response does not throw', async () => {
		fetchMock.mockResolvedValue({ ok: false, status: 500 });
		await insertWebhookProduct('wh-product', 'https://receiver.test/hook', 'k');

		await expect(
			firePaidOrderWebhooks(makeOrder([{ product: { _id: 'wh-product' } }]))
		).resolves.toBeUndefined();
	});
});
