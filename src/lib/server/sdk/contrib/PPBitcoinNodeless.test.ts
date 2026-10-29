import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PPBitcoinNodeless, { resetCheckScheduler } from './PPBitcoinNodeless';
import { resetMempoolPacing, saveBitcoinBlockHeight } from '$lib/server/bitcoin-nodeless';
import { refreshPromise, runtimeConfig } from '$lib/server/runtime-config';
import type { Order } from '$lib/types/Order';
import { ObjectId } from 'mongodb';
import { isAddressWatched, resetMempoolWebSocket } from '$lib/server/bitcoin-nodeless-ws';
import { dispatchPendingPayments, registerProcessor } from '../pp';
import { advance, FakeWebSocket, mockMempool, TEST_ZPUB } from '$lib/server/test-utils';

vi.mock('$lib/server/bitcoin-nodeless', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/server/bitcoin-nodeless')>()),
	// Keeps these tests off the database; bitcoin-nodeless.test.ts covers the save itself.
	saveBitcoinBlockHeight: vi.fn()
}));

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

function savedHeights() {
	return vi.mocked(saveBitcoinBlockHeight).mock.calls.map(([height]) => height);
}

function configureNodeless() {
	vi.stubGlobal('WebSocket', FakeWebSocket);
	runtimeConfig.bitcoinNodeless = {
		...runtimeConfig.bitcoinNodeless,
		format: 'bip84',
		publicKey: TEST_ZPUB
	};
}

describe('PPBitcoinNodeless.checkPayment', () => {
	beforeEach(async () => {
		await refreshPromise;
		runtimeConfig.bitcoinBlockHeight = 100;
		vi.mocked(saveBitcoinBlockHeight).mockReset().mockResolvedValue(undefined);
		resetCheckScheduler();
		resetMempoolPacing();
		resetMempoolWebSocket();
		FakeWebSocket.instances = [];
		vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
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
		resetMempoolWebSocket();
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

		describe('with the mempool WebSocket', () => {
			function watchOverWebSocket(payments: Order['payments'][number][]) {
				configureNodeless();
				PPBitcoinNodeless.watchPendingPayments(payments);
				const socket = FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
				socket.serverOpens();
				return socket;
			}

			it('asks mempool about a watched address every 5 minutes, an unwatched one every 30 seconds', async () => {
				const mempool = mockMempool();
				const watched = makePayment();
				const unwatched = makePayment({ address: OTHER_ADDRESS });
				watchOverWebSocket([watched]);

				const checkBoth = async () => {
					await PPBitcoinNodeless.checkPayment(watched, order);
					await PPBitcoinNodeless.checkPayment(unwatched, order);
					return [mempool.callsTo(`${ADDRESS}/txs`), mempool.callsTo(`${OTHER_ADDRESS}/txs`)];
				};

				expect(await checkBoth()).toEqual([1, 1]);
				advance(30_000);
				expect(await checkBoth()).toEqual([1, 2]);
				advance(5 * 60_000 - 30_001);
				expect(await checkBoth()).toEqual([1, 3]);
				advance(1);
				expect(await checkBoth()).toEqual([2, 3]);
			});

			it('checks a watched address on activity, never within 10 seconds of the last check', async () => {
				const mempool = mockMempool();
				const payment = makePayment();
				const socket = watchOverWebSocket([payment]);
				await PPBitcoinNodeless.checkPayment(payment, order);

				advance(1_000);
				socket.serverReportsActivity(ADDRESS);
				const callsAfter = async (ms: number) => {
					advance(ms);
					await PPBitcoinNodeless.checkPayment(payment, order);
					return mempool.callsTo('/txs');
				};

				expect(await callsAfter(8_999)).toBe(1);
				expect(await callsAfter(1)).toBe(2);
				expect(await callsAfter(10_000)).toBe(2);
			});

			it('checks again on the next turn when activity arrives while a check is running', async () => {
				const payment = makePayment();
				const socket = watchOverWebSocket([payment]);
				let notifyDuringCheck = true;
				const mempool = mockMempool({
					txs: () => {
						if (notifyDuringCheck) {
							notifyDuringCheck = false;
							socket.serverReportsActivity(ADDRESS);
						}
						return { body: [] };
					}
				});

				await PPBitcoinNodeless.checkPayment(payment, order);
				advance(10_000);
				await PPBitcoinNodeless.checkPayment(payment, order);
				expect(mempool.callsTo('/txs')).toBe(2);
				advance(10_000);
				await PPBitcoinNodeless.checkPayment(payment, order);
				expect(mempool.callsTo('/txs')).toBe(2);
			});

			it('checks a payment awaiting confirmation on each new block, not an unpaid one', async () => {
				const mempool = mockMempool({ txs: { body: [fullAmountTx()] } });
				const awaiting = makePayment({ awaitingConfirmation: true });
				const unpaid = makePayment({ address: OTHER_ADDRESS });
				const socket = watchOverWebSocket([awaiting, unpaid]);
				socket.serverSends({ blocks: [{ height: 100 }] });

				const checkBoth = async () => {
					await PPBitcoinNodeless.checkPayment(awaiting, order);
					await PPBitcoinNodeless.checkPayment(unpaid, order);
					return [mempool.callsTo(`${ADDRESS}/txs`), mempool.callsTo(`${OTHER_ADDRESS}/txs`)];
				};

				expect(await checkBoth()).toEqual([1, 1]);
				advance(10_000);
				socket.serverSends({ block: { height: 101 } });
				expect(await checkBoth()).toEqual([2, 1]);
				advance(10_000);
				socket.serverSends({ blocks: [{ height: 100 }, { height: 101 }] });
				expect(await checkBoth()).toEqual([2, 1]);
			});

			it('saves each new socket block height, skipping repeats and lagging ones, and follows a switch of network', () => {
				const socket = watchOverWebSocket([makePayment()]);

				for (const height of [4_800_000, 4_800_001, 4_800_001, 4_799_995, 973_000, 973_001]) {
					socket.serverSends({ block: { height } });
				}

				expect(savedHeights()).toEqual([4_800_000, 4_800_001, 973_000, 973_001]);
			});

			it('records the block snapshot sent on open without treating it as a new block, also after regaining the lock', async () => {
				const mempool = mockMempool({ txs: { body: [fullAmountTx()] } });
				const awaiting = makePayment({ awaitingConfirmation: true });
				const unpaid = makePayment({ address: OTHER_ADDRESS });
				const checkAwaiting = async () => {
					await PPBitcoinNodeless.checkPayment(awaiting, order);
					return mempool.callsTo(`${ADDRESS}/txs`);
				};
				expect(await checkAwaiting()).toBe(1);

				advance(10_000);
				let socket = watchOverWebSocket([unpaid]);
				socket.serverSends({ blocks: [{ height: 101 }] });
				expect(await checkAwaiting()).toBe(1);
				advance(10_000);
				socket.serverSends({ block: { height: 102 } });
				expect(await checkAwaiting()).toBe(2);

				PPBitcoinNodeless.watchPendingPayments([]);
				advance(10_000);
				socket = watchOverWebSocket([unpaid]);
				socket.serverSends({ blocks: [{ height: 103 }] });
				expect(await checkAwaiting()).toBe(2);
				advance(10_000);
				socket.serverSends({ block: { height: 104 } });
				expect(await checkAwaiting()).toBe(3);
				expect(savedHeights()).toEqual([101, 102, 103, 104]);
			});

			it('treats the first block from a new mempool URL as the current tip, not a new block', async () => {
				const mempool = mockMempool({ txs: { body: [fullAmountTx()] } });
				const awaiting = makePayment({ awaitingConfirmation: true });
				const unpaid = makePayment({ address: OTHER_ADDRESS });
				const checkAwaiting = async () => {
					await PPBitcoinNodeless.checkPayment(awaiting, order);
					return mempool.callsTo(`${ADDRESS}/txs`);
				};
				watchOverWebSocket([unpaid]).serverSends({ blocks: [{ height: 101 }] });
				expect(await checkAwaiting()).toBe(1);

				advance(10_000);
				runtimeConfig.bitcoinNodeless.mempoolUrl = 'https://testnet-mempool.example';
				const socket = watchOverWebSocket([unpaid]);
				socket.serverSends({ blocks: [{ height: 4_800_000 }] });
				expect(await checkAwaiting()).toBe(1);

				advance(10_000);
				socket.serverSends({ block: { height: 4_800_001 } });
				expect(await checkAwaiting()).toBe(2);
			});

			it('checks a watched address as soon as its socket reopens', async () => {
				const mempool = mockMempool();
				const payment = makePayment();
				const socket = watchOverWebSocket([payment]);
				await PPBitcoinNodeless.checkPayment(payment, order);

				socket.serverDrops();
				advance(10_000);
				PPBitcoinNodeless.watchPendingPayments([payment]);
				FakeWebSocket.instances[FakeWebSocket.instances.length - 1].serverOpens();
				await PPBitcoinNodeless.checkPayment(payment, order);

				expect(mempool.callsTo('/txs')).toBe(2);
			});

			it('still asks mempool for the block height once a minute while a socket is open', async () => {
				const mempool = mockMempool();
				const payment = makePayment();
				const socket = watchOverWebSocket([payment]);
				socket.serverSends({ block: { height: 100 } });

				await PPBitcoinNodeless.checkPayment(payment, order);
				advance(60_000);
				socket.serverReportsActivity(ADDRESS);
				await PPBitcoinNodeless.checkPayment(payment, order);

				expect(mempool.callsTo('/blocks/tip/height')).toBe(2);
			});

			it('retries a failed check of a watched address 30 seconds later, then every 5 minutes', async () => {
				silenceLogs();
				const payment = makePayment();
				watchOverWebSocket([payment]);
				const failing = mockMempool({ txs: { status: 503 } });

				await PPBitcoinNodeless.checkPayment(payment, order);
				advance(29_999);
				await PPBitcoinNodeless.checkPayment(payment, order);
				expect(failing.callsTo('/txs')).toBe(1);
				advance(1);
				const mempool = mockMempool();
				await PPBitcoinNodeless.checkPayment(payment, order);
				advance(30_000);
				await PPBitcoinNodeless.checkPayment(payment, order);
				expect(mempool.callsTo('/txs')).toBe(1);
			});

			it('does not count a check refused by a rate limit pause, so the activity stays due', async () => {
				silenceLogs();
				mockMempool();
				const payment = makePayment();
				const socket = watchOverWebSocket([payment]);
				await PPBitcoinNodeless.checkPayment(payment, order);

				advance(10_000);
				socket.serverReportsActivity(ADDRESS);
				const limited = mockMempool({ txs: { status: 429 } });
				await PPBitcoinNodeless.checkPayment(payment, order);
				advance(2_000);
				await PPBitcoinNodeless.checkPayment(payment, order);
				expect(limited.callsTo('/txs')).toBe(1);

				advance(60_000);
				const mempool = mockMempool({ txs: { body: [fullAmountTx()] } });
				expect(await PPBitcoinNodeless.checkPayment(payment, order)).toEqual({
					status: 'pending',
					awaitingConfirmation: true,
					mempoolMissingSince: null,
					transactions: []
				});
				advance(10_000);
				await PPBitcoinNodeless.checkPayment(payment, order);
				expect(mempool.callsTo('/txs')).toBe(1);
			});
		});
	});

	describe('through the order loop dispatcher', () => {
		const pendingOrders = [
			{
				payments: [
					makePayment({ status: 'pending', processor: 'bitcoin-nodeless', method: 'bitcoin' })
				]
			}
		] as unknown as Order[];

		beforeEach(() => {
			registerProcessor(PPBitcoinNodeless);
			configureNodeless();
		});

		it('closes its sockets when the loop dispatches no order, as after losing the lock', () => {
			dispatchPendingPayments(pendingOrders);
			const [socket] = FakeWebSocket.instances;
			socket.serverOpens();
			expect(isAddressWatched(ADDRESS)).toBe(true);

			dispatchPendingPayments([]);

			expect([socket.closedByClient, isAddressWatched(ADDRESS), vi.getTimerCount()]).toEqual([
				true,
				false,
				0
			]);
		});

		it('closes its sockets and stops its timer once nodeless is no longer configured', () => {
			dispatchPendingPayments(pendingOrders);
			FakeWebSocket.instances[0].serverOpens();

			runtimeConfig.bitcoinNodeless.publicKey = '';
			dispatchPendingPayments(pendingOrders);
			dispatchPendingPayments(pendingOrders);

			expect(FakeWebSocket.instances.map((s) => s.closedByClient)).toEqual([true]);
			expect([isAddressWatched(ADDRESS), vi.getTimerCount()]).toEqual([false, 0]);
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
