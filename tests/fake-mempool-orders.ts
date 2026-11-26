import { expect, test } from '@playwright/test';
import { MongoClient, ObjectId, type Db, type Document } from 'mongodb';
import { createFakeMempool } from './fake-mempool.js';

// Same database as the web server started by playwright.config.ts.
const E2E_DB = 'bebop-e2e';
// TEST_ZPUB from src/lib/server/test-utils.ts, which imports vitest and so cannot load here.
const TEST_ZPUB =
	'zpub6r8LffkeFh5if3FefxX5zq5oQnQbLxXXPE87fEskLhY2v37Tj16TzMqRL7p32wQweeq1DpRYWrvm4t3ArKHrLNnVhPkFsHGdo3h6nyoppeS';
const PRICE_BTC = 0.0001;
export const PRICE_SATS = 10_000;
// Two checks of one address are at least 10s apart, and the order loop turns every 2s.
const QUIET_AFTER_CHECK_MS = 13_000;

type StringIdDocument = Document & { _id: string };

export type SeededState = { order: string; payment: string; awaitingConfirmation: boolean };

export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export function seconds(ms: number): string {
	return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Points the running shop at a fake mempool on `port` for the spec that calls it, and seeds
 * bitcoin-nodeless orders whose ids start with `idPrefix`.
 * Each spec needs its own port: a new mempool URL is what makes be-BOP forget a lowered per-socket limit.
 */
export function useFakeMempoolShop(port: number, idPrefix: string) {
	const mempool = createFakeMempool(port);
	let client: MongoClient;
	let db: Db;
	let savedConfig: Array<{ _id: string; doc: Document | null }> = [];

	const runtimeConfig = () => db.collection<StringIdDocument>('runtimeConfig');
	const orders = () => db.collection<StringIdDocument>('orders');

	async function seedOrder(
		name: string,
		opts: { expiresInMs?: number; awaitingConfirmation?: boolean } = {}
	): Promise<{ orderId: string; address: string }> {
		const orderId = idPrefix + name;
		const address = `${idPrefix}address-${name}`;
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
						_id: `${idPrefix}product`,
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

	test.beforeAll(async () => {
		await mempool.listen();
		client = await MongoClient.connect(process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017');
		db = client.db(E2E_DB);
		await orders().deleteMany({ _id: { $regex: `^${idPrefix}` } });
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
		await orders().deleteMany({ _id: { $regex: `^${idPrefix}` } });
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
		await orders().deleteMany({ _id: { $regex: `^${idPrefix}` } });
	});

	async function paymentOf(orderId: string): Promise<Document | undefined> {
		return (await orders().findOne({ _id: orderId }))?.payments[0];
	}

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

	return {
		mempool,
		seedOrder,
		paymentOf,
		stateOf,
		waitForChecksToSettle,
		waitForTracking
	};
}
