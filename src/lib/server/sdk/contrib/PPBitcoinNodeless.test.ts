import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PPBitcoinNodeless from './PPBitcoinNodeless';
import { runtimeConfig, runtimeConfigUpdatedAt } from '$lib/server/runtime-config';
import type { Order } from '$lib/types/Order';

describe('PPBitcoinNodeless.checkPayment', () => {
	const ADDRESS = 'bc1qrw2swpufzdx9gy4aewv5q45e53stcf95ker0p7';
	const AMOUNT = 100_000;
	const ORDER_CREATED_AT = new Date('2026-06-01T00:00:00Z');

	const secs = (d: Date) => Math.floor(d.getTime() / 1000);
	const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000);

	function mockFetchTxs(txs: unknown[]) {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => ({ ok: true, status: 200, statusText: 'OK', json: async () => txs }))
		);
	}

	function fullAmountTx(opts: { blockHeight?: number; blockTime?: Date } = {}) {
		const confirmed = opts.blockHeight !== undefined;
		return {
			txid: `tx-${opts.blockHeight ?? 'mempool'}`,
			status: confirmed
				? {
						confirmed: true,
						block_height: opts.blockHeight,
						block_time: secs(opts.blockTime ?? ORDER_CREATED_AT)
				  }
				: { confirmed: false },
			vout: [{ scriptpubkey_address: ADDRESS, value: AMOUNT }]
		};
	}

	function makePayment(over: Partial<Order['payments'][number]> = {}) {
		return {
			address: ADDRESS,
			price: { amount: AMOUNT, currency: 'SAT' },
			expiresAt: new Date('2026-06-01T00:20:00Z'), // 20 min after order creation
			...over
		} as unknown as Order['payments'][number];
	}

	const order = { createdAt: ORDER_CREATED_AT } as unknown as Order;

	beforeEach(() => {
		runtimeConfig.bitcoinBlockHeight = 100;
		runtimeConfig.bitcoinNodeless = {
			...runtimeConfig.bitcoinNodeless,
			mempoolUrl: 'https://mempool.example'
		};
		runtimeConfig.confirmationBlocksThresholds = {
			currency: 'SAT',
			defaultBlocks: 1,
			thresholds: []
		};
		// Skip the rate-limited block-height refresh fetch.
		runtimeConfigUpdatedAt['bitcoinBlockHeight'] = new Date();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('marks paid once the TX is confirmed to threshold', async () => {
		mockFetchTxs([fullAmountTx({ blockHeight: 100 })]); // 1 confirmation, threshold 1
		const res = await PPBitcoinNodeless.checkPayment(makePayment(), order);
		expect(res.status).toBe('paid');
	});

	it('holds as awaiting confirmation while a full-amount TX sits in the mempool (before expiry)', async () => {
		mockFetchTxs([fullAmountTx()]); // unconfirmed
		const res = await PPBitcoinNodeless.checkPayment(makePayment(), order);
		expect(res.status).toBe('pending');
		expect(res.awaitingConfirmation).toBe(true);
		expect(res.mempoolMissingSince).toBeNull();
	});

	it('expires past the deadline when no TX was ever seen', async () => {
		mockFetchTxs([]); // nothing in mempool
		const res = await PPBitcoinNodeless.checkPayment(
			makePayment({ expiresAt: minutesAgo(5) }),
			order
		);
		expect(res.status).toBe('expired');
	});

	it('starts a grace window on the first miss after a previously-seen TX drops', async () => {
		mockFetchTxs([]); // TX gone from mempool
		const before = Date.now();
		const res = await PPBitcoinNodeless.checkPayment(
			makePayment({ expiresAt: minutesAgo(5), awaitingConfirmation: true }),
			order
		);
		expect(res.status).toBe('pending');
		expect(res.awaitingConfirmation).toBe(true);
		expect(res.mempoolMissingSince).toBeInstanceOf(Date);
		expect((res.mempoolMissingSince as Date).getTime()).toBeGreaterThanOrEqual(before);
	});

	it('keeps holding within the 3-minute grace window', async () => {
		mockFetchTxs([]);
		const missingSince = minutesAgo(1);
		const res = await PPBitcoinNodeless.checkPayment(
			makePayment({
				expiresAt: minutesAgo(5),
				awaitingConfirmation: true,
				mempoolMissingSince: missingSince
			}),
			order
		);
		expect(res.status).toBe('pending');
		expect((res.mempoolMissingSince as Date).getTime()).toBe(missingSince.getTime());
	});

	it('expires once the grace window has elapsed', async () => {
		mockFetchTxs([]);
		const res = await PPBitcoinNodeless.checkPayment(
			makePayment({
				expiresAt: minutesAgo(10),
				awaitingConfirmation: true,
				mempoolMissingSince: minutesAgo(5) // > 3 min ago
			}),
			order
		);
		expect(res.status).toBe('expired');
	});

	it('resets the grace timer when an RBF replacement reappears', async () => {
		mockFetchTxs([fullAmountTx()]); // replacement back in mempool
		const res = await PPBitcoinNodeless.checkPayment(
			makePayment({
				expiresAt: minutesAgo(5),
				awaitingConfirmation: true,
				mempoolMissingSince: minutesAgo(1)
			}),
			order
		);
		expect(res.status).toBe('pending');
		expect(res.awaitingConfirmation).toBe(true);
		expect(res.mempoolMissingSince).toBeNull();
	});
});
