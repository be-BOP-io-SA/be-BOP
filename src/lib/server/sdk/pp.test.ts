import { describe, expect, it, vi } from 'vitest';
import {
	dispatchPendingPayments,
	processorFor,
	registerProcessor,
	type PaymentProcessorDefinition
} from './pp';
import type { Order } from '$lib/types/Order';

type Payment = Order['payments'][number];

function processor(
	meta: PaymentProcessorDefinition['meta'],
	opts: { enabled?: boolean; watch?: (payments: Payment[]) => void } = {}
): PaymentProcessorDefinition {
	return {
		meta,
		isEnabled: () => opts.enabled ?? true,
		paymentPrice: (price) => price,
		createPayment: async () => ({ processor: meta.processor }),
		checkPayment: async () => ({ status: 'pending' }),
		...(opts.watch && { watchPendingPayments: opts.watch })
	};
}

function payment(id: string, over: Partial<Payment>): Payment {
	return { _id: id, status: 'pending', ...over } as unknown as Payment;
}

describe('processorFor', () => {
	it('picks the enabled processor whose name and method both match the payment', () => {
		registerProcessor(processor({ processor: 'stripe', method: 'card' }));
		registerProcessor(processor({ processor: 'paypal', method: 'paypal' }, { enabled: false }));

		const names = [
			payment('card', { processor: 'stripe', method: 'card' }),
			payment('tap-to-pay', { processor: 'stripe', method: 'point-of-sale' }),
			payment('disabled', { processor: 'paypal', method: 'paypal' }),
			payment('unknown', { processor: 'nobody' as Payment['processor'], method: 'card' }),
			payment('none', { method: 'bank-transfer' })
		].map((p) => processorFor(p)?.meta.processor ?? null);

		expect(names).toEqual(['stripe', null, null, null, null]);
	});
});

describe('dispatchPendingPayments', () => {
	it('hands each watching processor its own pending payments, and [] once the loop lets go', () => {
		const watched: Record<string, string[][]> = { nodeless: [], lnd: [] };
		const record = (key: string) => (payments: Payment[]) =>
			watched[key].push(payments.map((p) => String(p._id)));
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

		registerProcessor(
			processor(
				{ processor: 'swiss-bitcoin-pay', method: 'lightning' },
				{
					watch: () => {
						throw new Error('boom');
					}
				}
			)
		);
		registerProcessor(
			processor({ processor: 'bitcoin-nodeless', method: 'bitcoin' }, { watch: record('nodeless') })
		);
		registerProcessor(
			processor({ processor: 'lnd', method: 'lightning' }, { enabled: false, watch: record('lnd') })
		);
		registerProcessor(processor({ processor: 'bitcoind', method: 'bitcoin' }));

		const orders = [
			{
				payments: [
					payment('a', { processor: 'bitcoin-nodeless', method: 'bitcoin' }),
					payment('b', { processor: 'bitcoin-nodeless', method: 'bitcoin', status: 'paid' }),
					payment('c', { processor: 'bitcoin-nodeless', method: 'point-of-sale' }),
					payment('d', { processor: 'bitcoind', method: 'bitcoin' })
				]
			},
			{
				payments: [
					payment('e', { processor: 'bitcoin-nodeless', method: 'bitcoin' }),
					payment('f', { processor: 'lnd', method: 'lightning' })
				]
			}
		] as unknown as Order[];

		dispatchPendingPayments(orders);
		dispatchPendingPayments([]);

		expect(watched).toEqual({ nodeless: [['a', 'e'], []], lnd: [[], []] });
		expect(error.mock.calls.map(([message]) => message)).toEqual([
			'swiss-bitcoin-pay failed to watch pending payments:',
			'swiss-bitcoin-pay failed to watch pending payments:'
		]);
	});

	it('asks each watching processor once whether it is enabled, however many payments it has', () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const isEnabled = vi.fn(() => true);
		registerProcessor({
			...processor({ processor: 'phoenixd', method: 'lightning' }, { watch: () => undefined }),
			isEnabled
		});
		const payments = ['a', 'b', 'c'].map((id) =>
			payment(id, { processor: 'phoenixd', method: 'lightning' })
		);

		dispatchPendingPayments([{ payments }] as unknown as Order[]);

		expect(isEnabled).toHaveBeenCalledTimes(1);
	});
});
