import { expect, test } from '@playwright/test';
import { MongoClient, ObjectId, type Db, type Document } from 'mongodb';
import { startFakeMempool, type FakeMempool } from './fake-mempool.js';

// Same database as the web server started by playwright.config.ts.
const E2E_DB = 'bebop-e2e';
const ID_PREFIX = 'e2e-mempool-';
const MEMPOOL_PORT = 5013;
// TEST_ZPUB from src/lib/server/test-utils.ts, which imports vitest and so cannot load here.
const TEST_ZPUB =
	'zpub6r8LffkeFh5if3FefxX5zq5oQnQbLxXXPE87fEskLhY2v37Tj16TzMqRL7p32wQweeq1DpRYWrvm4t3ArKHrLNnVhPkFsHGdo3h6nyoppeS';
const PRICE_BTC = 0.0001;
const PRICE_SATS = 10_000;
// Two checks of one address are at least 10s apart, and the order loop turns every 2s.
const QUIET_AFTER_CHECK_MS = 13_000;

let mempool: FakeMempool;
let client: MongoClient;
let db: Db;
let savedConfig: Array<{ _id: string; doc: Document | null }> = [];

type StringIdDocument = Document & { _id: string };

function runtimeConfig() {
	return db.collection<StringIdDocument>('runtimeConfig');
}

function orders() {
	return db.collection<StringIdDocument>('orders');
}

test.beforeAll(async () => {
	mempool = await startFakeMempool(MEMPOOL_PORT);
	client = await MongoClient.connect(process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017');
	db = client.db(E2E_DB);
	await orders().deleteMany({ _id: { $regex: `^${ID_PREFIX}` } });
	savedConfig = await Promise.all(
		['bitcoinNodeless', 'bitcoinBlockHeight'].map(async (_id) => ({
			_id,
			doc: await runtimeConfig().findOne({ _id })
		}))
	);
	// The server is already running, so it can only learn this through its runtimeConfig change stream.
	await runtimeConfig().updateOne(
		{ _id: 'bitcoinNodeless' },
		{
			$set: {
				data: {
					mempoolUrl: mempool.url,
					format: 'bip84',
					publicKey: TEST_ZPUB,
					derivationIndex: 0,
					skipUsedAddresses: true
				},
				updatedAt: new Date()
			}
		},
		{ upsert: true }
	);

	// A fresh server waits for the orders lock left by the previous one to expire before checking payments.
	test.setTimeout(180_000);
	const probe = await seedOrder('probe');
	await expect
		.poll(() => mempool.txsRequestTimes(probe.address).length, {
			message: 'the server checks payments against the mempool URL from its change stream',
			timeout: 170_000
		})
		.toBeGreaterThan(0);
	await orders().deleteOne({ _id: probe.orderId });
});

test.afterAll(async () => {
	await orders().deleteMany({ _id: { $regex: `^${ID_PREFIX}` } });
	for (const { _id, doc } of savedConfig) {
		if (doc) {
			await runtimeConfig().replaceOne({ _id }, doc, { upsert: true });
		} else {
			await runtimeConfig().deleteOne({ _id });
		}
	}
	await client.close();
	await mempool.close();
});

test.beforeEach(() => {
	mempool.reset();
});

test.afterEach(async () => {
	await orders().deleteMany({ _id: { $regex: `^${ID_PREFIX}` } });
});

async function seedOrder(
	name: string,
	opts: { expiresInMs?: number; awaitingConfirmation?: boolean } = {}
): Promise<{ orderId: string; address: string }> {
	const orderId = ID_PREFIX + name;
	const address = `e2e-address-${name}`;
	// Older than any block_time the fake stamps, which be-BOP would discard as predating the order.
	const createdAt = new Date(Date.now() - 60_000);
	const eur = { amount: 10, currency: 'EUR' };
	await orders().insertOne({
		_id: orderId,
		number: Math.floor(Math.random() * 1e9),
		locale: 'en',
		status: 'pending',
		createdAt,
		updatedAt: createdAt,
		user: {},
		notifications: { paymentStatus: {} },
		items: [
			{
				_id: new ObjectId(),
				product: {
					_id: `${ID_PREFIX}product`,
					name: 'E2E mempool product',
					type: 'resource',
					price: eur,
					tagIds: []
				},
				quantity: 1,
				vatRate: 0,
				currencySnapshot: { main: { price: eur }, priceReference: { price: eur } }
			}
		],
		payments: [
			{
				_id: new ObjectId(),
				status: 'pending',
				method: 'bitcoin',
				processor: 'bitcoin-nodeless',
				price: { amount: PRICE_BTC, currency: 'BTC' },
				currencySnapshot: { main: { price: eur }, priceReference: { price: eur } },
				createdAt,
				expiresAt: new Date(Date.now() + (opts.expiresInMs ?? 60 * 60_000)),
				address,
				...(opts.awaitingConfirmation && { awaitingConfirmation: true })
			}
		],
		currencySnapshot: { main: { totalPrice: eur }, priceReference: { totalPrice: eur } }
	});
	return { orderId, address };
}

type SeededState = { order: string; payment: string; awaitingConfirmation: boolean };

async function stateOf(orderId: string): Promise<SeededState | null> {
	const order = await orders().findOne({ _id: orderId });
	return (
		order && {
			order: order.status,
			payment: order.payments[0].status,
			awaitingConfirmation: order.payments[0].awaitingConfirmation ?? false
		}
	);
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function seconds(ms: number): string {
	return `${(ms / 1000).toFixed(1)}s`;
}

/** Waits until each address was checked and no check is due on what be-BOP already knows. */
async function waitForChecksToSettle(addresses: string[]): Promise<void> {
	await expect
		.poll(
			() =>
				addresses.every((address) => {
					const last = mempool.txsRequestTimes(address).at(-1);
					return last !== undefined && Date.now() - last > QUIET_AFTER_CHECK_MS;
				}),
			{ timeout: 60_000, intervals: [500] }
		)
		.toBe(true);
}

async function waitForTracking(addresses: string[]): Promise<void> {
	await expect
		.poll(() => addresses.filter((a) => mempool.trackedAddresses().includes(a)).length, {
			timeout: 30_000
		})
		.toBe(addresses.length);
}

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
