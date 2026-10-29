import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PPBitcoinNodeless, { resetCheckScheduler } from './PPBitcoinNodeless';
import { resetMempoolPacing } from '$lib/server/bitcoin-nodeless';
import { refreshPromise, runtimeConfig } from '$lib/server/runtime-config';
import type { Order } from '$lib/types/Order';
import { ObjectId } from 'mongodb';
import { advance, mockMempool } from '$lib/server/test-utils';

const ADDRESS = 'bc1qrw2swpufzdx9gy4aewv5q45e53stcf95ker0p7';
const OTHER_ADDRESS = 'bc1qa07qeugkc8u7pjv98dejfdnd5ml7qxv88zwzrn';
const AMOUNT = 100_000;
const ORDER_CREATED_AT = new Date('2026-06-01T00:00:00Z');
const order = { createdAt: ORDER_CREATED_AT } as unknown as Order;

const secs = (d: Date) => Math.floor(d.getTime() / 1000);
const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000);
const minutesFromNow = (n: number) => new Date(Date.now() + n * 60_000);

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
		_id: new ObjectId(),
		address: ADDRESS,
		price: { amount: AMOUNT, currency: 'SAT' },
		expiresAt: minutesFromNow(15),
		...over
	} as unknown as Order['payments'][number];
}

function silenceLogs() {
	return {
		log: vi.spyOn(console, 'log').mockImplementation(() => undefined),
		warn: vi.spyOn(console, 'warn').mockImplementation(() => undefined),
		error: vi.spyOn(console, 'error').mockImplementation(() => undefined)
	};
}

describe('PPBitcoinNodeless.checkPayment', () => {
	beforeEach(async () => {
		await refreshPromise;
		runtimeConfig.bitcoinBlockHeight = 100;
		resetCheckScheduler();
		resetMempoolPacing();
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(new Date('2026-06-01T00:05:00Z'));
		runtimeConfig.bitcoinNodeless = {
			...runtimeConfig.bitcoinNodeless,
			mempoolUrl: 'https://mempool.example'
		};
		runtimeConfig.confirmationBlocksThresholds = {
			currency: 'SAT',
			defaultBlocks: 1,
			thresholds: []
		};
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	describe('mempool request pacing', () => {
		it('asks mempool about an address at once, then at most once every 30 seconds', async () => {
			runtimeConfig.bitcoinNodeless.mempoolUrl = 'https://mempool.example/';
			const mempool = mockMempool();
			const payment = makePayment();

			await PPBitcoinNodeless.checkPayment(payment, order);
			expect(mempool.callsTo('/txs')).toBe(1);
			advance(29_999);
			await PPBitcoinNodeless.checkPayment(payment, order);
			expect(mempool.callsTo('/txs')).toBe(1);

			advance(1);
			await PPBitcoinNodeless.checkPayment(payment, order);
			expect(mempool.callsTo('/txs')).toBe(2);
			expect(mempool.urls()[1]).toBe(`https://mempool.example/api/address/${ADDRESS}/txs`);
		});

		it('paces each address on its own', async () => {
			const mempool = mockMempool();

			await PPBitcoinNodeless.checkPayment(makePayment(), order);
			await PPBitcoinNodeless.checkPayment(makePayment({ address: OTHER_ADDRESS }), order);

			expect([mempool.callsTo(`${ADDRESS}/txs`), mempool.callsTo(`${OTHER_ADDRESS}/txs`)]).toEqual([
				1, 1
			]);
		});

		it('returns the stored state unchanged between two checks, so the order loop writes nothing', async () => {
			const mempool = mockMempool();
			const payment = makePayment();
			await PPBitcoinNodeless.checkPayment(payment, order);

			const missingSince = new Date('2026-06-01T00:04:00Z');
			advance(2_000);
			const skipped = await PPBitcoinNodeless.checkPayment(
				{ ...payment, awaitingConfirmation: true, mempoolMissingSince: missingSince },
				order
			);

			expect(mempool.callsTo('/txs')).toBe(1);
			expect(skipped).toEqual({
				status: 'pending',
				awaitingConfirmation: true,
				mempoolMissingSince: missingSince
			});
		});

		it('checks again right away when the clock goes back', async () => {
			const mempool = mockMempool();
			const payment = makePayment();

			await PPBitcoinNodeless.checkPayment(payment, order);
			advance(-1);
			await PPBitcoinNodeless.checkPayment(payment, order);

			expect(mempool.callsTo('/txs')).toBe(2);
		});

		it('checks once more as soon as the deadline passes, 10 seconds after the last check at the earliest', async () => {
			const mempool = mockMempool({ txs: { body: [fullAmountTx()] } });
			const payment = makePayment({ expiresAt: new Date(Date.now() + 5_000) });
			await PPBitcoinNodeless.checkPayment(payment, order);

			const callsAt = async (ms: number) => {
				advance(ms);
				await PPBitcoinNodeless.checkPayment(payment, order);
				return mempool.callsTo('/txs');
			};

			expect(await callsAt(9_999)).toBe(1);
			expect(await callsAt(1)).toBe(2);
			expect(await callsAt(2_000)).toBe(2);
			expect(await callsAt(18_000)).toBe(2);
			expect(await callsAt(10_000)).toBe(3);
		});

		it('does not expire a payment on an answer fetched before the deadline, and expires it on the next check', async () => {
			mockMempool({
				txs: () => {
					advance(2_000);
					return { body: [] };
				}
			});
			const payment = makePayment({ expiresAt: new Date(Date.now() + 1_000) });

			expect(await PPBitcoinNodeless.checkPayment(payment, order)).toEqual({
				status: 'pending',
				awaitingConfirmation: false,
				mempoolMissingSince: null,
				transactions: []
			});
			advance(8_000);
			expect(await PPBitcoinNodeless.checkPayment(payment, order)).toEqual({ status: 'expired' });
		});

		it('checks again as soon as the RBF grace ends, without waiting for the next 30-second check', async () => {
			mockMempool();
			const missingSince = new Date(Date.now() - 3 * 60_000 + 15_000);
			const payment = makePayment({
				expiresAt: minutesAgo(10),
				awaitingConfirmation: true,
				mempoolMissingSince: missingSince
			});
			const holding = {
				status: 'pending',
				awaitingConfirmation: true,
				mempoolMissingSince: missingSince
			};

			expect(await PPBitcoinNodeless.checkPayment(payment, order)).toEqual({
				...holding,
				transactions: []
			});
			advance(14_999);
			expect(await PPBitcoinNodeless.checkPayment(payment, order)).toEqual(holding);
			advance(1);
			expect(await PPBitcoinNodeless.checkPayment(payment, order)).toEqual({ status: 'expired' });
		});

		it('keeps the stored state while mempool requests are paused, even past the deadline', async () => {
			const { warn, error } = silenceLogs();
			const mempool = mockMempool({ txs: { status: 429 } });

			const limited = await PPBitcoinNodeless.checkPayment(makePayment(), order);
			const expired = makePayment({ address: OTHER_ADDRESS, expiresAt: minutesAgo(5) });
			const paused = await PPBitcoinNodeless.checkPayment(expired, order);

			const pending = { status: 'pending', awaitingConfirmation: false, mempoolMissingSince: null };
			expect([limited, paused]).toEqual([pending, pending]);
			expect(mempool.callsTo('/txs')).toBe(1);
			expect(warn).toHaveBeenCalledTimes(1);
			expect(error.mock.calls).toEqual([]);

			advance(60_000);
			mockMempool();
			expect(await PPBitcoinNodeless.checkPayment(expired, order)).toEqual({ status: 'expired' });
		});

		it('never fails a check because mempool failed, so the order loop cannot expire the payment', async () => {
			const { warn } = silenceLogs();
			const failures = [{ status: 503 }, new Error('ECONNRESET')];
			const cases = failures.flatMap((failure) =>
				[true, false].flatMap((awaitingConfirmation) =>
					[minutesAgo(5), minutesFromNow(5)].map((expiresAt) => ({
						failure,
						payment: makePayment({ awaitingConfirmation, expiresAt })
					}))
				)
			);

			const results = [];
			for (const { failure, payment } of cases) {
				resetCheckScheduler();
				mockMempool({ txs: failure });
				results.push(await PPBitcoinNodeless.checkPayment(payment, order));
			}

			expect(results).toEqual(
				[true, true, false, false, true, true, false, false].map((awaitingConfirmation) => ({
					status: 'pending',
					awaitingConfirmation,
					mempoolMissingSince: null
				}))
			);
			expect(warn.mock.calls.map((call) => call.length)).toEqual(Array(8).fill(2));
			expect(warn.mock.calls.slice(0, 1).map(([, reason]) => reason)).toEqual([
				`Mempool API error 503  for address ${ADDRESS}`
			]);
			expect(warn.mock.calls.slice(-1).map(([, reason]) => reason)).toEqual(['ECONNRESET']);
		});

		it('retries a failed check 30 seconds later', async () => {
			silenceLogs();
			const mempool = mockMempool({ txs: { status: 503 } });
			const payment = makePayment();

			await PPBitcoinNodeless.checkPayment(payment, order);
			advance(29_999);
			await PPBitcoinNodeless.checkPayment(payment, order);
			expect(mempool.callsTo('/txs')).toBe(1);
			advance(1);
			await PPBitcoinNodeless.checkPayment(payment, order);
			expect(mempool.callsTo('/txs')).toBe(2);
		});
	});

	it('still throws on a payment without an address', async () => {
		await expect(
			PPBitcoinNodeless.checkPayment(makePayment({ address: undefined }), order)
		).rejects.toThrow('Missing address on bitcoin-nodeless payment');
	});

	it('marks paid once the TX is confirmed to threshold', async () => {
		mockMempool({ txs: { body: [fullAmountTx({ blockHeight: 100 })] } }); // 1 confirmation, threshold 1
		const res = await PPBitcoinNodeless.checkPayment(makePayment(), order);
		expect(res.status).toBe('paid');
	});

	it('holds as awaiting confirmation while a full-amount TX sits in the mempool (before expiry)', async () => {
		mockMempool({ txs: { body: [fullAmountTx()] } }); // unconfirmed
		const res = await PPBitcoinNodeless.checkPayment(makePayment(), order);
		expect(res.status).toBe('pending');
		expect(res.awaitingConfirmation).toBe(true);
		expect(res.mempoolMissingSince).toBeNull();
	});

	it('expires past the deadline when no TX was ever seen', async () => {
		mockMempool(); // nothing in mempool
		const res = await PPBitcoinNodeless.checkPayment(
			makePayment({ expiresAt: minutesAgo(5) }),
			order
		);
		expect(res.status).toBe('expired');
	});

	it('starts a grace window on the first miss after a previously-seen TX drops', async () => {
		mockMempool(); // TX gone from mempool
		const res = await PPBitcoinNodeless.checkPayment(
			makePayment({ expiresAt: minutesAgo(5), awaitingConfirmation: true }),
			order
		);
		expect(res.status).toBe('pending');
		expect(res.awaitingConfirmation).toBe(true);
		expect(res.mempoolMissingSince).toEqual(new Date('2026-06-01T00:05:00Z'));
	});

	it('keeps holding within the 3-minute grace window', async () => {
		mockMempool();
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
		mockMempool();
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
		mockMempool({ txs: { body: [fullAmountTx()] } }); // replacement back in mempool
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
