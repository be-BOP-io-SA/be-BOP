import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runtimeConfig } from '$lib/server/runtime-config';
import type { Order } from '$lib/types/Order';
import PPPaypal from './PPPaypal';

const CHECKOUT_ID = 'paypal-checkout-1';

const unit = (captureStatus?: string) => ({
	amount: { currency_code: 'EUR', value: '12.50' },
	...(captureStatus && {
		payments: {
			captures: [{ status: captureStatus, amount: { currency_code: 'EUR', value: '12.50' } }]
		}
	})
});

/** Answers PayPal's token, order and capture endpoints, and records every call */
function mockPaypal(captureBody: Record<string, unknown>, { readBackFails = false } = {}) {
	let captured = false;
	const calls: Array<{ url: string; init?: RequestInit }> = [];
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string, init?: RequestInit) => {
			calls.push({ url, init });
			if (url.endsWith('/v1/oauth2/token')) {
				return Response.json({ access_token: 'token', expires_in: 3600 });
			}
			if (url.endsWith('/capture')) {
				captured = true;
				return Response.json(captureBody);
			}
			if (captured && readBackFails) {
				return new Response('Service Unavailable', { status: 503 });
			}
			return Response.json(
				captured
					? { id: CHECKOUT_ID, status: 'COMPLETED', purchase_units: [unit('COMPLETED')] }
					: { id: CHECKOUT_ID, status: 'APPROVED', purchase_units: [unit()] }
			);
		})
	);
	return calls;
}

function payment(expiresAt?: Date) {
	return { checkoutId: CHECKOUT_ID, expiresAt } as Order['payments'][number];
}

describe('PayPal', () => {
	const config = { ...runtimeConfig.paypal };

	beforeEach(() => {
		runtimeConfig.paypal = { ...config, clientId: 'client-id', secret: 'secret', sandbox: true };
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		runtimeConfig.paypal = config;
	});

	it('asks the capture for the full order', async () => {
		const calls = mockPaypal({
			id: CHECKOUT_ID,
			status: 'COMPLETED',
			purchase_units: [unit('COMPLETED')]
		});

		await PPPaypal.checkPayment(payment(), {} as Order);

		const capture = calls.find((call) => call.url.endsWith('/capture'));
		expect(new Headers(capture?.init?.headers).get('Prefer')).toBe('return=representation');
	});

	it('reads the captures from the capture response when it has them', async () => {
		const calls = mockPaypal({
			id: CHECKOUT_ID,
			status: 'COMPLETED',
			purchase_units: [unit('COMPLETED')]
		});

		const result = await PPPaypal.checkPayment(payment(), {} as Order);

		expect(result).toEqual({ status: 'paid', received: { amount: 12.5, currency: 'EUR' } });
		expect(calls.filter((call) => call.url.endsWith(`/orders/${CHECKOUT_ID}`))).toHaveLength(1);
	});

	it('reads the order again when the capture response is the minimal one', async () => {
		mockPaypal({ id: CHECKOUT_ID, status: 'COMPLETED', links: [] });

		const result = await PPPaypal.checkPayment(payment(), {} as Order);

		expect(result).toEqual({ status: 'paid', received: { amount: 12.5, currency: 'EUR' } });
	});

	it('adds up several captures to the cent', async () => {
		const capture = (value: string) => ({
			status: 'COMPLETED',
			amount: { currency_code: 'EUR', value }
		});
		mockPaypal({
			id: CHECKOUT_ID,
			status: 'COMPLETED',
			purchase_units: [
				{
					amount: { currency_code: 'EUR', value: '30.30' },
					payments: { captures: [capture('10.10'), capture('20.20')] }
				}
			]
		});

		const result = await PPPaypal.checkPayment(payment(), {} as Order);

		expect(result).toEqual({ status: 'paid', received: { amount: 30.3, currency: 'EUR' } });
	});

	it('keeps a payment captured past its deadline pending when the order cannot be read back', async () => {
		mockPaypal({ id: CHECKOUT_ID, status: 'COMPLETED', links: [] }, { readBackFails: true });

		const result = await PPPaypal.checkPayment(payment(new Date(Date.now() - 1000)), {} as Order);

		expect(result).toEqual({ status: 'pending' });
	});
});
