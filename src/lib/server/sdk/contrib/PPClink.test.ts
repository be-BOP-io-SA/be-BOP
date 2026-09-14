import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PPClink from './PPClink';
import type { CheckPaymentResult, PaymentProcessorDefinition } from '../pp';
import type { Order } from '$lib/types/Order';
import type { Price } from '$lib/types/Order';
import type { PaymentProcessor } from '$lib/server/payment-methods';

vi.mock('$lib/server/clink', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/server/clink')>();
	return {
		...actual,
		isClinkConfigured: vi.fn(() => true),
		clinkCreateInvoice: vi.fn(),
		clinkCheckInvoiceViaLightningPub: vi.fn()
	};
});

// PPClink only uses getProcessor/lightningPaymentPrice/lightningLabel from ../pp.
// Mocking the registry module without importOriginal avoids the vitest 0.34
// deadlock that happens when a mocked module is pulled back in transitively.
vi.mock('../pp', () => ({
	getProcessor: vi.fn(),
	registerProcessor: vi.fn(),
	lightningPaymentPrice: vi.fn(() => ({ amount: 0, currency: 'SAT' })),
	lightningLabel: vi.fn(() => 'be-BOP')
}));

import {
	isClinkConfigured,
	clinkCreateInvoice,
	clinkCheckInvoiceViaLightningPub
} from '$lib/server/clink';
import { getProcessor } from '../pp';

type Backend = PaymentProcessorDefinition & {
	checkPayment: ReturnType<typeof vi.fn>;
};

function makeBackend(name: PaymentProcessor): Backend {
	const checkPayment = vi.fn(async (): Promise<CheckPaymentResult> => ({ status: 'paid' }));
	const backend: Backend = {
		meta: { processor: name, method: 'lightning', emoji: '⚡' },
		isEnabled: () => true,
		paymentPrice: (price: Price) => price,
		createPayment: vi.fn(async () => ({
			address: 'lnbc100',
			invoiceId: `hash-${name}`,
			processor: name
		})),
		checkPayment
	};
	return backend;
}

const makePayment = (
	over: Partial<Order['payments'][number]> & { meta?: { backend?: string; bolt11?: string } } = {}
) =>
	({
		address: 'lnbc100',
		invoiceId: 'hash-lnd',
		price: { amount: 100, currency: 'SAT' },
		meta: { backend: 'lnd' },
		...over
	}) as unknown as Order['payments'][number];

const order = { createdAt: new Date() } as unknown as Order;

describe('PPClink', () => {
	beforeEach(() => {
		vi.mocked(clinkCreateInvoice).mockReset();
		vi.mocked(clinkCheckInvoiceViaLightningPub).mockReset();
		vi.mocked(isClinkConfigured).mockReturnValue(true);
		vi.mocked(getProcessor).mockReset();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('is enabled when CLINK is configured', () => {
		expect(PPClink.isEnabled()).toBe(true);
	});

	it('createPayment delegates to the backend and returns the real payment hash', async () => {
		vi.mocked(clinkCreateInvoice).mockResolvedValueOnce({
			bolt11: 'lnbc100',
			paymentHash: 'hash-1',
			backendProcessor: 'lnd'
		});

		const result = await PPClink.createPayment({
			orderId: 'order-1',
			orderNumber: 42,
			paymentId: 'payment-1',
			toPay: { amount: 100, currency: 'SAT' }
		});

		expect(clinkCreateInvoice).toHaveBeenCalledOnce();
		expect(result.invoiceId).toBe('hash-1');
		expect(result.address).toBe('lnbc100');
		expect(result.meta).toEqual({ backend: 'lnd' });
	});

	it('concurrent createPayment calls produce distinct payment hashes', async () => {
		vi.mocked(clinkCreateInvoice)
			.mockResolvedValueOnce({ bolt11: 'lnbc100', paymentHash: 'hash-a', backendProcessor: 'lnd' })
			.mockResolvedValueOnce({ bolt11: 'lnbc100', paymentHash: 'hash-b', backendProcessor: 'lnd' });

		const [a, b] = await Promise.all([
			PPClink.createPayment({
				orderId: 'order-a',
				orderNumber: 1,
				paymentId: 'payment-a',
				toPay: { amount: 100, currency: 'SAT' }
			}),
			PPClink.createPayment({
				orderId: 'order-b',
				orderNumber: 2,
				paymentId: 'payment-b',
				toPay: { amount: 100, currency: 'SAT' }
			})
		]);

		expect(a.invoiceId).not.toEqual(b.invoiceId);
		expect(a.invoiceId).toBe('hash-a');
		expect(b.invoiceId).toBe('hash-b');
	});

	it('createPayment throws when invoice creation fails (no bare nOffer fallback)', async () => {
		vi.mocked(clinkCreateInvoice).mockRejectedValueOnce(new Error('relay down'));

		await expect(
			PPClink.createPayment({
				orderId: 'order-1',
				orderNumber: 1,
				paymentId: 'payment-1',
				toPay: { amount: 100, currency: 'SAT' }
			})
		).rejects.toThrow('relay down');
	});

	it('checkPayment re-dispatches to the persisted backend with the real payment hash', async () => {
		const lnd = makeBackend('lnd');
		vi.mocked(getProcessor).mockImplementation((name) => (name === 'lnd' ? lnd : undefined));

		const result = await PPClink.checkPayment(makePayment(), order);

		expect(getProcessor).toHaveBeenCalledWith('lnd');
		expect(lnd.checkPayment).toHaveBeenCalledOnce();
		const [syntheticPayment] = lnd.checkPayment.mock.calls[0];
		expect(syntheticPayment.processor).toBe('lnd');
		expect(syntheticPayment.invoiceId).toBe('hash-lnd');
		expect(result.status).toBe('paid');
	});

	it('checkPayment falls back to the default lightning processor without meta.backend', async () => {
		const lnd = makeBackend('lnd');
		vi.mocked(getProcessor).mockImplementation((name) => (name === 'lnd' ? lnd : undefined));

		const result = await PPClink.checkPayment(makePayment({ meta: undefined }), order);

		expect(lnd.checkPayment).toHaveBeenCalledOnce();
		expect(result.status).toBe('paid');
	});

	it('checkPayment throws when no lightning backend is available', async () => {
		vi.mocked(getProcessor).mockImplementation(() => undefined);

		await expect(
			PPClink.checkPayment(makePayment({ meta: { backend: 'gone' } }), order)
		).rejects.toThrow('No Lightning backend available');
	});

	it('createPayment persists the bolt11 alongside the lightning-pub marker', async () => {
		vi.mocked(clinkCreateInvoice).mockResolvedValueOnce({
			bolt11: 'lnbc100',
			paymentHash: 'hash-lp',
			backendProcessor: 'lightning-pub'
		});

		const result = await PPClink.createPayment({
			orderId: 'order-1',
			orderNumber: 42,
			paymentId: 'payment-1',
			toPay: { amount: 100, currency: 'SAT' }
		});

		expect(result.invoiceId).toBe('hash-lp');
		expect(result.meta).toEqual({ backend: 'lightning-pub', bolt11: 'lnbc100' });
	});

	it('checkPayment settles lightning-pub payments by querying the Lightning.Pub node', async () => {
		vi.mocked(clinkCheckInvoiceViaLightningPub).mockResolvedValueOnce({
			paid: true,
			paidAt: 1496314658,
			amountSat: 100
		});

		const result = await PPClink.checkPayment(
			makePayment({ meta: { backend: 'lightning-pub', bolt11: 'lnbc100' } }),
			order
		);

		expect(clinkCheckInvoiceViaLightningPub).toHaveBeenCalledWith({
			bolt11: 'lnbc100',
			expectedAmountSat: 100
		});
		expect(result.status).toBe('paid');
		expect(result.received).toEqual({ amount: 100, currency: 'SAT' });
	});

	it('checkPayment reports pending while the Lightning.Pub node has not settled', async () => {
		vi.mocked(clinkCheckInvoiceViaLightningPub).mockResolvedValueOnce({
			paid: false,
			paidAt: 0,
			amountSat: 0
		});

		const result = await PPClink.checkPayment(
			makePayment({ meta: { backend: 'lightning-pub', bolt11: 'lnbc100' } }),
			order
		);

		expect(result.status).toBe('pending');
	});

	it('checkPayment does not fall back to a be-BOP processor for lightning-pub payments', async () => {
		vi.mocked(clinkCheckInvoiceViaLightningPub).mockResolvedValueOnce({
			paid: true,
			paidAt: 1496314658,
			amountSat: 100
		});

		await PPClink.checkPayment(
			makePayment({ meta: { backend: 'lightning-pub', bolt11: 'lnbc100' } }),
			order
		);

		expect(getProcessor).not.toHaveBeenCalled();
	});

	it('checkPayment throws when a lightning-pub payment lacks its persisted invoice', async () => {
		await expect(
			PPClink.checkPayment(makePayment({ meta: { backend: 'lightning-pub', bolt11: '' } }), order)
		).rejects.toThrow('Missing Lightning.Pub invoice');
	});
});
