import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Force the feature flag on for the whole file: env-config freezes the flag at import time, so
// we spread the real module and override only ALLOW_PAID_ORDER_WEBHOOK (every other consumer —
// ./database etc. — keeps the real values).
vi.mock('./env-config', async (importOriginal) => {
	const actual = await importOriginal<typeof import('./env-config')>();
	return { ...actual, ALLOW_PAID_ORDER_WEBHOOK: 'true' };
});

import { createHmac } from 'crypto';
import { cleanDb } from './test-utils';
import { collections } from './database';
import { firePaidOrderWebhooks, stripPaidOrderWebhook } from './order-paid-webhook';
import type { Order } from '$lib/types/Order';
import type { Product } from '$lib/types/Product';

function makeOrder(
	items: Array<{ product: { _id: string } }>,
	overrides: Partial<Order> = {}
): Order {
	return {
		number: 4242,
		items,
		notifications: { paymentStatus: { email: 'buyer@example.com', npub: null } },
		customCheckoutFields: [],
		...overrides
	} as unknown as Order;
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
		expect(opts.headers['Content-Type']).toBe('application/json');

		// Signature must be HMAC-SHA256(secret, rawBody) — the exact contract the receiver verifies.
		const expected = 'sha256=' + createHmac('sha256', secret).update(opts.body).digest('hex');
		expect(opts.headers['X-Webhook-Signature']).toBe(expected);

		const payload = JSON.parse(opts.body);
		expect(payload.orderNumber).toBe(4242);
		expect(payload.contact).toEqual({ email: 'buyer@example.com', npub: null });
		expect(payload.billingAddress).toEqual({ firstName: 'Jane', country: 'FR' });
		expect(payload.customCheckoutFields).toEqual([
			{ slug: 'company', label: 'Company', value: 'Acme' }
		]);
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
