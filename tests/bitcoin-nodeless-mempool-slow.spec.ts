import { expect, test } from '@playwright/test';
import { PRICE_SATS, seconds, sleep, useFakeMempoolShop } from './fake-mempool-orders.js';

// MEMPOOL_DROP_GRACE_MS and WATCHED_CHECK_INTERVAL_MS in PPBitcoinNodeless.ts.
const DROP_GRACE_MS = 3 * 60_000;
const WATCHED_CHECK_INTERVAL_MS = 5 * 60_000;
// An order loop turn every 2s, plus the time a check takes against the local fake.
const SCHEDULING_SLACK_MS = 5_000;

const { mempool, seedOrder, paymentOf, stateOf, waitForChecksToSettle, waitForTracking } =
	useFakeMempoolShop(5014, 'e2e-slowpool-');

/** An order past its expiry whose full payment sits in the mempool, as be-BOP last saw it. */
async function seedLatePaymentInMempool(name: string) {
	const seeded = await seedOrder(name, { expiresInMs: -60_000, awaitingConfirmation: true });
	const tx = mempool.addTx(seeded.address, PRICE_SATS);
	await waitForTracking([seeded.address]);
	await waitForChecksToSettle([seeded.address]);
	expect(await stateOf(seeded.orderId)).toEqual({
		order: 'pending',
		payment: 'pending',
		awaitingConfirmation: true
	});
	return { ...seeded, tx };
}

async function waitForMissingSince(orderId: string): Promise<number> {
	await expect
		.poll(async () => (await paymentOf(orderId))?.mempoolMissingSince, { timeout: 15_000 })
		.toBeInstanceOf(Date);
	return (await paymentOf(orderId))?.mempoolMissingSince.getTime();
}

test('a late payment whose transaction leaves the mempool expires once the RBF grace is over', async () => {
	test.setTimeout(6 * 60_000);
	const { orderId, tx } = await seedLatePaymentInMempool('rbf-dropped');

	const removedAt = Date.now();
	mempool.removeTx(tx.txid);
	const missingSince = await waitForMissingSince(orderId);
	console.log(`rbf dropped: missing since ${seconds(missingSince - removedAt)} after the removal`);

	await sleep(missingSince + DROP_GRACE_MS - SCHEDULING_SLACK_MS - Date.now());
	expect(await stateOf(orderId)).toEqual({
		order: 'pending',
		payment: 'pending',
		awaitingConfirmation: true
	});
	expect((await paymentOf(orderId))?.mempoolMissingSince.getTime()).toBe(missingSince);

	await expect
		.poll(async () => (await stateOf(orderId))?.order, { timeout: 2 * SCHEDULING_SLACK_MS })
		.toBe('expired');
	const expiredAfter = Date.now() - missingSince;
	console.log(`rbf dropped: expired ${seconds(expiredAfter)} after missing since`);
	expect(expiredAfter).toBeGreaterThanOrEqual(DROP_GRACE_MS);
});

test('a replacement paying in full during the RBF grace keeps the order until it is mined', async () => {
	test.setTimeout(7 * 60_000);
	const { orderId, address, tx } = await seedLatePaymentInMempool('rbf-replaced');

	mempool.removeTx(tx.txid);
	const missingSince = await waitForMissingSince(orderId);

	await sleep(30_000);
	const replacedAt = Date.now();
	mempool.addTx(address, PRICE_SATS);
	await expect
		.poll(async () => (await paymentOf(orderId))?.mempoolMissingSince, { timeout: 15_000 })
		.toBeUndefined();
	console.log(
		`rbf replaced: grace cleared ${seconds(Date.now() - replacedAt)} after the replacement`
	);

	// Past the end the first grace would have had, the replacement alone keeps the order alive.
	await sleep(missingSince + DROP_GRACE_MS + 15_000 - Date.now());
	expect(await stateOf(orderId)).toEqual({
		order: 'pending',
		payment: 'pending',
		awaitingConfirmation: true
	});

	const minedAt = Date.now();
	mempool.mine(1);
	await expect.poll(async () => (await stateOf(orderId))?.order, { timeout: 20_000 }).toBe('paid');
	console.log(`rbf replaced: paid ${seconds(Date.now() - minedAt)} after the block`);
});

test('a payment whose WebSocket message is lost is found by the 5-minute poll', async () => {
	test.setTimeout(8 * 60_000);
	const { orderId, address } = await seedOrder('lost-message');
	await waitForTracking([address]);
	await waitForChecksToSettle([address]);
	const checks = mempool.txsRequestTimes(address);
	const lastCheckAt = checks[checks.length - 1];

	const sentAt = Date.now();
	mempool.addTx(address, PRICE_SATS, { confirmed: true, silent: true });
	await expect
		.poll(async () => (await stateOf(orderId))?.order, {
			timeout: WATCHED_CHECK_INTERVAL_MS + 30_000,
			intervals: [1_000]
		})
		.toBe('paid');

	const after = mempool.txsRequestTimes(address);
	const pollGap = after[after.length - 1] - lastCheckAt;
	console.log(
		`lost message: paid ${seconds(Date.now() - sentAt)} after the transaction, by a check ${seconds(
			pollGap
		)} after the previous one`
	);
	expect(after.length).toBe(checks.length + 1);
	expect(pollGap).toBeGreaterThanOrEqual(WATCHED_CHECK_INTERVAL_MS);
	expect(pollGap).toBeLessThan(WATCHED_CHECK_INTERVAL_MS + SCHEDULING_SLACK_MS);
});
