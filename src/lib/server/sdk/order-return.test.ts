import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ORIGIN } from '$lib/server/env-config';
import { runtimeConfig } from '$lib/server/runtime-config';
import PPOsb from '$lib/payment-processors/osb/processor.server';
import PPPaypal from '$lib/payment-processors/paypal/processor.server';
import PPSumUp from '$lib/payment-processors/sumup/processor.server';
import { orderReturnUrl } from './pp';

const RETURN_URL = `${ORIGIN}/order/ORDER?paymentReturn=PAYMENT`;

/** Answers each provider's "create a checkout" call, and keeps what it was sent. */
function mockProviders() {
	const sent: string[] = [];
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string, init?: RequestInit) => {
			sent.push(String(init?.body ?? ''));
			if (url.endsWith('/v1/oauth2/token')) {
				return Response.json({ access_token: 'token', expires_in: 3600 });
			}
			if (url.includes('paypal.com')) {
				return Response.json({ id: 'CHECKOUT', links: [{ rel: 'approve', href: 'https://pay' }] });
			}
			if (url.includes('sumup.com')) {
				return Response.json({ id: 'CHECKOUT' });
			}
			return Response.json({
				status: 'SUCCESS',
				answer: {
					paymentOrderId: 'CHECKOUT',
					paymentURL: 'https://pay.example/checkout',
					paymentOrderStatus: 'RUNNING',
					amount: 1000,
					currency: 'XPF'
				}
			});
		})
	);
	return sent;
}

describe('where a provider sends the buyer once they paid', () => {
	const paypalConfig = { ...runtimeConfig.paypal };

	beforeEach(() => {
		Object.assign(runtimeConfig.paypal, { clientId: 'client', secret: 'secret' });
	});

	afterEach(() => {
		Object.assign(runtimeConfig.paypal, paypalConfig);
		vi.unstubAllGlobals();
	});

	it('is the order page, told which payment to wait for', () => {
		expect(orderReturnUrl('ORDER', 'PAYMENT')).toBe(RETURN_URL);
	});

	it.each([
		['PayPal', PPPaypal, 'EUR'],
		['SumUp', PPSumUp, 'EUR'],
		['OSB', PPOsb, 'XPF']
	] as const)('is what %s is given when the payment is created', async (_, processor, currency) => {
		const sent = mockProviders();

		await processor.createPayment({
			orderId: 'ORDER',
			orderNumber: 1,
			paymentId: 'PAYMENT',
			toPay: { amount: 10, currency }
		});

		expect(sent.join('\n')).toContain(JSON.stringify(RETURN_URL));
	});
});
