import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { PRICE_SATS, seconds, sleep, useFakeMempoolShop } from './fake-mempool-orders.js';

const { mempool, seedOrder, stateOf, waitForChecksToSettle, waitForTracking } = useFakeMempoolShop(
	5013,
	'e2e-mempool-'
);

test('a payment announced over the WebSocket is checked at once', async () => {
	test.setTimeout(90_000);
	const { orderId, address } = await seedOrder('ws-fast-path');

	await waitForTracking([address]);
	await waitForChecksToSettle([address]);
	const checksBefore = mempool.txsRequestTimes(address).length;

	const sentAt = Date.now();
	mempool.addTx(address, PRICE_SATS, { confirmed: true });
	// A watched address is polled every 5 minutes, so only the WebSocket message can explain this.
	await expect.poll(async () => (await stateOf(orderId))?.order, { timeout: 10_000 }).toBe('paid');
	const detectedIn = Date.now() - sentAt;
	console.log(`ws fast path: paid ${seconds(detectedIn)} after the transaction`);

	expect(mempool.txsRequestTimes(address).length).toBe(checksBefore + 1);
	expect(mempool.txsRequestTimes(address).at(-1)).toBeGreaterThanOrEqual(sentAt);
	expect(detectedIn).toBeLessThan(5_000);
});

test('a 429 storm expires nothing, and payments resume once mempool answers again', async () => {
	test.setTimeout(150_000);
	mempool.failHttp(429);
	const awaiting = await seedOrder('storm-awaiting', {
		expiresInMs: -60_000,
		awaitingConfirmation: true
	});
	mempool.addTx(awaiting.address, PRICE_SATS);
	const unpaid = await seedOrder('storm-unpaid', { expiresInMs: -60_000 });

	await expect
		.poll(() => mempool.requests().txs + mempool.requests().tipHeight, { timeout: 15_000 })
		.toBeGreaterThan(0);
	const rateLimitedAt = Date.now();
	await sleep(10_000);

	expect(await stateOf(awaiting.orderId)).toEqual({
		order: 'pending',
		payment: 'pending',
		awaitingConfirmation: true
	});
	expect(await stateOf(unpaid.orderId)).toEqual({
		order: 'pending',
		payment: 'pending',
		awaitingConfirmation: false
	});
	// The first 429 pauses every mempool request for 60s, so five order loop turns sent nothing more.
	expect(mempool.requests().txs + mempool.requests().tipHeight).toBe(1);

	mempool.failHttp(null);
	await expect
		.poll(async () => (await stateOf(unpaid.orderId))?.order, { timeout: 70_000 })
		.toBe('expired');
	console.log(
		`429 storm: unpaid payment expired ${seconds(Date.now() - rateLimitedAt)} after the 429`
	);
	// A transaction in the mempool keeps a late payment alive past its expiry.
	expect(await stateOf(awaiting.orderId)).toEqual({
		order: 'pending',
		payment: 'pending',
		awaitingConfirmation: true
	});

	const minedAt = Date.now();
	mempool.mine(1);
	await expect
		.poll(async () => (await stateOf(awaiting.orderId))?.order, { timeout: 20_000 })
		.toBe('paid');
	console.log(`429 storm: awaiting payment paid ${seconds(Date.now() - minedAt)} after the block`);
});

test('a mempool answering 500 expires nothing, and payments settle once it recovers', async () => {
	test.setTimeout(180_000);
	mempool.failHttp(500);
	const awaiting = await seedOrder('outage-awaiting', {
		expiresInMs: -60_000,
		awaitingConfirmation: true
	});
	mempool.addTx(awaiting.address, PRICE_SATS);
	const unpaid = await seedOrder('outage-unpaid', { expiresInMs: -60_000 });
	const expiring = await seedOrder('outage-expiring', { expiresInMs: 20_000 });
	const outageStartedAt = Date.now();

	// Long enough for the third payment to pass its expiry and for every address to be retried.
	await sleep(70_000);

	const stillPending = (awaitingConfirmation: boolean) => ({
		order: 'pending',
		payment: 'pending',
		awaitingConfirmation
	});
	expect(await stateOf(awaiting.orderId)).toEqual(stillPending(true));
	expect(await stateOf(unpaid.orderId)).toEqual(stillPending(false));
	expect(await stateOf(expiring.orderId)).toEqual(stillPending(false));
	const failedChecks = [awaiting, unpaid, expiring].map(
		({ address }) => mempool.txsRequestTimes(address).length
	);
	console.log(
		`500 outage: ${JSON.stringify(failedChecks)} failed checks per address over ${seconds(
			Date.now() - outageStartedAt
		)}`
	);
	// A failed check is retried after 30s rather than the 5 minutes of a watched address.
	for (const count of failedChecks) {
		expect(count).toBeGreaterThanOrEqual(2);
	}
	// The payment that expired during the outage was checked again after its deadline.
	expect(mempool.txsRequestTimes(expiring.address).at(-1)).toBeGreaterThan(
		outageStartedAt + 20_000
	);

	const recoveredAt = Date.now();
	mempool.failHttp(null);
	for (const { orderId } of [unpaid, expiring]) {
		await expect
			.poll(async () => (await stateOf(orderId))?.order, { timeout: 40_000 })
			.toBe('expired');
	}
	console.log(
		`500 outage: both unpaid payments expired ${seconds(Date.now() - recoveredAt)} after recovery`
	);
	expect(await stateOf(awaiting.orderId)).toEqual(stillPending(true));

	const minedAt = Date.now();
	mempool.mine(1);
	await expect
		.poll(async () => (await stateOf(awaiting.orderId))?.order, { timeout: 20_000 })
		.toBe('paid');
	console.log(`500 outage: awaiting payment paid ${seconds(Date.now() - minedAt)} after the block`);
});

test('a dropped or silent WebSocket is replaced and payments are still found', async () => {
	test.setTimeout(180_000);
	const dropped = await seedOrder('socket-dropped');
	await waitForTracking([dropped.address]);
	const connectionsBeforeDrop = mempool.connections();

	const droppedAt = Date.now();
	mempool.dropSockets();
	await expect
		.poll(() => mempool.connections(), { timeout: 15_000 })
		.toBeGreaterThan(connectionsBeforeDrop);
	await waitForTracking([dropped.address]);
	console.log(`socket drop: tracking again ${seconds(Date.now() - droppedAt)} after the drop`);
	mempool.addTx(dropped.address, PRICE_SATS, { confirmed: true });
	await expect
		.poll(async () => (await stateOf(dropped.orderId))?.order, { timeout: 15_000 })
		.toBe('paid');

	const silentPaid = await seedOrder('socket-silent-paid');
	// Still pending once the other is paid, so be-BOP has a reason to open a new socket.
	const silentUnpaid = await seedOrder('socket-silent-unpaid');
	await waitForTracking([silentPaid.address, silentUnpaid.address]);
	await waitForChecksToSettle([silentPaid.address, silentUnpaid.address]);
	const connectionsBeforeSilence = mempool.connections();

	const silencedAt = Date.now();
	mempool.silenceSockets();
	// The socket never reports it, and a watched address is polled every 5 minutes.
	mempool.addTx(silentPaid.address, PRICE_SATS, { confirmed: true });
	await expect
		.poll(async () => (await stateOf(silentPaid.orderId))?.order, { timeout: 90_000 })
		.toBe('paid');
	console.log(`socket silence: paid ${seconds(Date.now() - silencedAt)} after silence`);
	await expect
		.poll(() => mempool.connections(), { timeout: 15_000 })
		.toBeGreaterThan(connectionsBeforeSilence);
	await waitForTracking([silentUnpaid.address]);
	console.log(`socket silence: tracking again ${seconds(Date.now() - silencedAt)} after silence`);
});

test('ten pending payments stay within the mempool request budget', async () => {
	test.setTimeout(120_000);
	const seeded = await Promise.all(Array.from({ length: 10 }, (_, i) => seedOrder(`budget-${i}`)));
	const startedAt = Date.now();
	await sleep(60_000);

	const requests = mempool.requests();
	const perAddress = seeded.map(({ address }) => mempool.txsRequestTimes(address).length);
	console.log(
		`request budget over ${seconds(Date.now() - startedAt)}: ${JSON.stringify(
			requests
		)}, txs per address ${JSON.stringify(perAddress)}`
	);

	expect(perAddress).not.toContain(0);
	// Per address: the first check, one more when the socket opens, a third as slack.
	expect(requests.txs).toBeLessThanOrEqual(3 * seeded.length);
	// The tip height is refreshed at most once a minute; a 60s window can hold two refreshes.
	expect(requests.tipHeight).toBeLessThanOrEqual(2);
	expect(requests.address).toBe(0);
});

function escapeRegExp(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

for (const [locale, language] of [
	['en-US', 'en'],
	['fr-FR', 'fr']
]) {
	test.describe(`order page in ${locale}`, () => {
		test.use({ locale, storageState: { cookies: [], origins: [] } });

		test('the customer sees the payment awaiting confirmation, then paid', async ({ page }) => {
			test.setTimeout(90_000);
			const { order: text } = JSON.parse(
				readFileSync(new URL(`../src/lib/translations/${language}.json`, import.meta.url), 'utf8')
			);
			const status = (label: string) => new RegExp(`- ${escapeRegExp(label)}$`);
			// The count depends on the shop's confirmation thresholds, so every plural form is accepted.
			const awaitingMessage = new RegExp(
				Object.values<string>(text.awaitingConfirmationBitcoin)
					.map((form) => escapeRegExp(form).replace('\\{count\\}', '\\d+'))
					.join('|')
			);
			const { orderId, address } = await seedOrder(`page-${language}`);

			await page.goto(`/order/${orderId}`);
			const paymentSummary = page.locator('details.payment-item > summary').first();
			await expect(paymentSummary).toHaveText(status(text.paymentStatus.pending));

			mempool.addTx(address, PRICE_SATS);
			await expect(paymentSummary).toHaveText(status(text.paymentStatus.awaitingConfirmation), {
				timeout: 20_000
			});
			await expect(page.getByText(awaitingMessage)).toBeVisible();

			mempool.mine(1);
			await expect(paymentSummary).toHaveText(status(text.paymentStatus.paid), {
				timeout: 20_000
			});
			await expect(page.getByText(awaitingMessage)).toHaveCount(0);
		});
	});
}

// Last, because the server keeps the lowered limit for the life of the process.
test('a mempool tracking one address per socket still watches every payment', async () => {
	test.setTimeout(90_000);
	mempool.setMaxTrackedAddresses(1);
	const seeded = await Promise.all(['limit-a', 'limit-b', 'limit-c'].map((n) => seedOrder(n)));
	const addresses = seeded.map((s) => s.address);

	await waitForTracking(addresses);
	expect(mempool.trackingSockets()).toBe(3);
	await waitForChecksToSettle(addresses);

	const sentAt = Date.now();
	for (const address of addresses) {
		mempool.addTx(address, PRICE_SATS, { confirmed: true });
	}
	for (const { orderId } of seeded) {
		await expect
			.poll(async () => (await stateOf(orderId))?.order, { timeout: 10_000 })
			.toBe('paid');
	}
	console.log(`one address per socket: 3 payments paid within ${seconds(Date.now() - sentAt)}`);
});
