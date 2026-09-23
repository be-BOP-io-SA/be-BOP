import { beforeEach, describe, expect, it } from 'vitest';
import { serializePresentation } from './pp';
import { BITCOIN_PRESENTATION, LIGHTNING_PRESENTATION } from './contrib/presentations';
import type { PaymentProcessorDefinition } from './pp';
import PPBitcoind from './contrib/PPBitcoind';
import PPPhoenixd from './contrib/PPPhoenixd';
import PPTaler from './contrib/PPTaler';
import PPOsb from './contrib/PPOsb';
import { exchangeRate } from '$lib/stores/exchangeRate';
import { SATOSHIS_PER_BTC } from '$lib/types/Currency';
import type { Order, Price } from '$lib/types/Order';

const payment = (address: string, price: Price) =>
	({ address, price, method: 'bitcoin' }) as Order['payments'][number];

describe('payment presentation', () => {
	// Per test, not per file: other suites share this store and reset it as they go.
	beforeEach(() => exchangeRate.set({ SAT: SATOSHIS_PER_BTC, EUR: 30_000 }));

	describe('bitcoin', () => {
		const bitcoin = payment('bc1qexample', { amount: 0.004, currency: 'BTC' });

		it('encodes the settled amount, not the shop currency amount', () => {
			expect(BITCOIN_PRESENTATION.qrPayload?.(bitcoin)).toBe('bitcoin:bc1qexample?amount=0.004');
		});

		it('gives the link and the image the same payload', () => {
			expect(BITCOIN_PRESENTATION.qrLink?.(bitcoin)).toBe(
				BITCOIN_PRESENTATION.qrPayload?.(bitcoin)
			);
		});

		it('converts a settlement currency that is not BTC', () => {
			const inSats = payment('bc1qexample', { amount: 400_000, currency: 'SAT' });

			expect(BITCOIN_PRESENTATION.qrPayload?.(inSats)).toBe('bitcoin:bc1qexample?amount=0.004');
		});
	});

	describe('lightning', () => {
		it('links the bolt11 under the lightning scheme', () => {
			const invoice = payment('lnbc1example', { amount: 400_000, currency: 'SAT' });

			expect(LIGHTNING_PRESENTATION.qrLink?.(invoice)).toBe('lightning:lnbc1example');
		});

		it('leaves the payload to the address itself', () => {
			expect(LIGHTNING_PRESENTATION.qrPayload).toBeUndefined();
		});
	});

	describe('declarations', () => {
		it('agrees with what each processor actually mints', () => {
			expect(PPBitcoind.presentation).toBe(BITCOIN_PRESENTATION);
			expect(PPPhoenixd.presentation).toBe(LIGHTNING_PRESENTATION);
			expect(PPTaler.presentation.kind).toBe('qr');
			expect(PPOsb.presentation.kind).toBe('redirect');
		});
	});

	describe('serializePresentation', () => {
		it('is absent when the processor declares nothing', () => {
			const bare = { meta: { processor: 'osb', method: 'osb' } } as PaymentProcessorDefinition;

			expect(
				serializePresentation(bare, payment('x', { amount: 1, currency: 'EUR' }))
			).toBeUndefined();
		});

		it('is absent when no processor handled the payment', () => {
			expect(
				serializePresentation(undefined, payment('x', { amount: 1, currency: 'EUR' }))
			).toBeUndefined();
		});

		it('resolves the link and head tags for the browser', () => {
			const taler = payment('taler://pay/example', { amount: 12, currency: 'EUR' });

			expect(serializePresentation(PPTaler, taler)).toEqual({
				kind: 'qr',
				headTags: [{ name: 'taler-support', content: 'taler://pay/example' }]
			});
		});

		it('carries no function across to the client', () => {
			const serialized = serializePresentation(
				PPBitcoind,
				payment('bc1q', { amount: 1, currency: 'BTC' })
			);

			expect(Object.values(serialized ?? {}).every((v) => typeof v !== 'function')).toBe(true);
			expect(serialized?.qrLink).toBe('bitcoin:bc1q?amount=1');
		});
	});
});
