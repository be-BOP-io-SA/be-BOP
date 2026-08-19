import { MongoClient } from 'mongodb';
import { beforeEach, describe, expect, it } from 'vitest';
import { env } from '$env/dynamic/private';
import { cleanDb } from '$lib/server/test-utils';
import { collections } from '$lib/server/database';
import { runtimeConfig } from '$lib/server/runtime-config';
import { TEST_DIGITAL_PRODUCT } from '$lib/server/seed/product';
import { createApiKey } from '$lib/server/api/keys';
import { listCatalogProducts, getCatalogProduct } from '$lib/server/api/v1/catalog/listProducts';
import { writeBatch } from '$lib/server/api/v1/orders/writeBatch';
import { listPaidOrders } from '$lib/server/api/v1/orders/listPaid';
import { amountToMinor } from '$lib/server/api/v1/orders/money';
import type { AuthenticatedApiKey } from '$lib/types/ApiV1';

const MONGO_UNAVAILABLE_MSG =
	'Mongo not available — start docker compose -f docker-compose.dev.yml up -d mongo';

/** listPaidOrders now returns a query error instead of throwing; tests want the success branch. */
async function listPaidOk(query: Parameters<typeof listPaidOrders>[0] = {}) {
	const res = await listPaidOrders(query);
	if ('error' in res) {
		throw new Error(`unexpected query error on ${res.error.field}: ${res.error.message}`);
	}
	return res;
}

async function isMongoAvailable(): Promise<boolean> {
	const url = env.MONGODB_TEST_URL || 'mongodb://127.0.0.1:27017';
	const probe = new MongoClient(url, {
		directConnection: true,
		serverSelectionTimeoutMS: 2_000
	});
	try {
		await probe.connect();
		await probe.db('admin').command({ ping: 1 });
		return true;
	} catch {
		return false;
	} finally {
		await probe.close().catch(() => undefined);
	}
}

const mongoAvailable = await isMongoAvailable();
if (!mongoAvailable) {
	console.warn(MONGO_UNAVAILABLE_MSG);
}

describe.skipIf(!mongoAvailable)('API v1 e2e: key → catalog → POST order → GET paid-orders', () => {
	beforeEach(async () => {
		await cleanDb();
		await collections.products.insertOne({ ...TEST_DIGITAL_PRODUCT });
		runtimeConfig.mainCurrency = 'EUR';
		runtimeConfig.secondaryCurrency = 'USD';
		runtimeConfig.vatExempted = true;
	});

	it('runs the Face A concentrator loop with uniqueKey', async () => {
		const { apiKey, secret } = await createApiKey({
			name: 'e2e-pos',
			scopes: ['orders:write', 'catalog:read', 'orders:read']
		});
		expect(secret.startsWith('bebop_ak_')).toBe(true);

		const catalog = await listCatalogProducts({}, 'en');
		expect(catalog.products.some((p) => p.id === TEST_DIGITAL_PRODUCT._id)).toBe(true);
		const detail = await getCatalogProduct(TEST_DIGITAL_PRODUCT._id, 'en');
		expect(detail?.price.currency).toBe('EUR');

		const auth: AuthenticatedApiKey = {
			_id: apiKey._id,
			name: apiKey.name,
			scopes: apiKey.scopes,
			keyPrefix: apiKey.keyPrefix
		};
		const amountMinor = amountToMinor(TEST_DIGITAL_PRODUCT.price.amount, 'EUR');
		const written = await writeBatch({
			apiKey: auth,
			orders: [
				{
					externalOrderId: 'e2e-pos-1',
					currency: 'EUR',
					items: [
						{
							productId: TEST_DIGITAL_PRODUCT._id,
							quantity: 1,
							uniqueKey: 'kfdjsfeaz12845ND9xezj91820'
						}
					],
					payment: {
						method: 'point-of-sale',
						status: 'paid',
						amountMinor,
						currency: 'EUR'
					}
				}
			]
		});
		expect(written.results[0].status).toBe('created');
		const orderId = written.results[0].orderId;
		expect(orderId).toBeTruthy();

		const paid = await listPaidOk();
		const found = paid.orders.find((o) => o.orderId === orderId);
		expect(found).toBeTruthy();
		expect(found?.amountPaid.amountMinor).toBe(amountMinor);
		expect(found?.items[0].uniqueKey).toBe('kfdjsfeaz12845ND9xezj91820');
	});

	it('hides unpaid orders from the paid read', async () => {
		const { apiKey } = await createApiKey({
			name: 'e2e-unpaid',
			scopes: ['orders:write', 'orders:read']
		});
		const auth: AuthenticatedApiKey = {
			_id: apiKey._id,
			name: apiKey.name,
			scopes: apiKey.scopes,
			keyPrefix: apiKey.keyPrefix
		};
		const amountMinor = amountToMinor(TEST_DIGITAL_PRODUCT.price.amount, 'EUR');
		await writeBatch({
			apiKey: auth,
			orders: [
				{
					externalOrderId: 'e2e-pending-1',
					currency: 'EUR',
					items: [{ productId: TEST_DIGITAL_PRODUCT._id, quantity: 1 }],
					payment: {
						method: 'point-of-sale',
						status: 'pending',
						amountMinor,
						currency: 'EUR'
					}
				}
			]
		});
		const paid = await listPaidOk();
		expect(paid.orders).toHaveLength(0);
	});

	it('does not list a product hidden from both eShop and retail', async () => {
		await collections.products.insertOne({
			...TEST_DIGITAL_PRODUCT,
			_id: 'hidden-product',
			alias: ['hidden-product'],
			actionSettings: {
				...TEST_DIGITAL_PRODUCT.actionSettings,
				eShop: { visible: false, canBeAddedToBasket: false },
				retail: { visible: false, canBeAddedToBasket: false }
			}
		});
		const catalog = await listCatalogProducts({}, 'en');
		expect(catalog.products.map((p) => p.id)).not.toContain('hidden-product');
		expect(await getCatalogProduct('hidden-product', 'en')).toBeNull();
	});
});
