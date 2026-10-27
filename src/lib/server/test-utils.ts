import { env } from '$env/dynamic/private';
import { UserIdentifier } from '$lib/types/UserIdentifier';
import { collections, connectPromise, createIndexes, db } from './database';
import { refreshPromise, runtimeConfig } from './runtime-config';
import { SATOSHIS_PER_BTC } from '$lib/types/Currency';
import { addDays, subDays } from 'date-fns';
import { ObjectId } from 'mongodb';
import type { Order, OrderPayment } from '$lib/types/Order';
import { TEST_DIGITAL_PRODUCT } from './seed/product';

export async function cleanDb() {
	if (!env.VITEST) {
		throw new Error('cleanDb is only available in test mode');
	}
	if (db.databaseName !== 'bootik-test') {
		throw new Error('cleanDb can only be used with the bootik-test database');
	}
	await connectPromise;
	await refreshPromise;
	// Empty every collection instead of `db.dropDatabase()`. Dropping the database races background
	// collection creation — the runtimeConfig change-stream `refresh()` (which seeds default roles /
	// posPaymentSubtypes) and index creation — which throws "Cannot create collection … database is
	// in the process of being dropped" (code 215) and "index '_id_' dropped" (code 175) as unhandled
	// rejections that fail the whole run. Clearing documents gives each test the same clean slate
	// without ever dropping a collection.
	const cols = await db.collections();
	await Promise.all(cols.map((c) => c.deleteMany({})));
	await createIndexes();

	// Seed exchange rates for tests since defaultExchangeRate is now dynamic
	Object.assign(runtimeConfig.exchangeRate, {
		SAT: SATOSHIS_PER_BTC,
		EUR: 30_000,
		CHF: 30_000,
		USD: 30_000
	});
}

export async function createPaidSubscription(subscriptionProductId: string, user: UserIdentifier) {
	if (!(await collections.products.findOne({ _id: subscriptionProductId, type: 'subscription' }))) {
		throw new Error(`Subscription product not found in database: ${subscriptionProductId}`);
	}
	await collections.paidSubscriptions.insertOne({
		_id: crypto.randomUUID(),
		productId: subscriptionProductId,
		paidUntil: addDays(new Date(), 1),
		createdAt: new Date(),
		updatedAt: new Date(),
		number: 1,
		user,
		notifications: []
	});
}

/**
 * Inserts a paid order as stored in production, including the heavy embedded product snapshot,
 * without going through checkout.
 */
export async function insertTestOrder(
	overrides: Partial<Omit<Order, 'payments'>> & { payments?: Partial<OrderPayment>[] } = {}
) {
	const createdAt = overrides.createdAt ?? new Date();
	const price = { amount: 10, currency: 'EUR' as const };
	const { payments, ...rest } = overrides;
	const order = {
		_id: crypto.randomUUID(),
		number: Math.floor(Math.random() * 1e9),
		locale: 'en',
		status: 'paid',
		createdAt,
		updatedAt: createdAt,
		user: {},
		clientIp: '127.0.0.1',
		items: [
			{
				_id: new ObjectId(),
				product: {
					...TEST_DIGITAL_PRODUCT,
					description: 'x'.repeat(2_000),
					contentBefore: '<p>CMS content</p>'
				},
				quantity: 1,
				vatRate: 20,
				currencySnapshot: { main: { price }, priceReference: { price } }
			}
		],
		payments: (payments ?? [{}]).map((payment) => ({
			_id: new ObjectId(),
			status: 'paid',
			method: 'bank-transfer',
			price,
			currencySnapshot: { main: { price }, priceReference: { price } },
			createdAt,
			paidAt: createdAt,
			clientSecret: 'secret',
			...payment
		})),
		currencySnapshot: {
			main: { totalPrice: price, vat: [{ amount: 1.67, currency: 'EUR' }] },
			priceReference: { totalPrice: price }
		},
		...rest
	} as Order;
	await collections.orders.insertOne(order);
	return order;
}

export async function createDiscount(params: {
	discountedProductId: string;
	subscriptionProductId: string;
	percentage: number;
}) {
	const { discountedProductId, subscriptionProductId, percentage } = params;
	if (!(await collections.products.findOne({ _id: discountedProductId, type: 'resource' }))) {
		throw new Error(`Product to discount not found in database: ${discountedProductId}`);
	}
	if (!(await collections.products.findOne({ _id: subscriptionProductId, type: 'subscription' }))) {
		throw new Error(`Subscription product not found in database: ${subscriptionProductId}`);
	}
	await collections.discounts.insertOne({
		_id: crypto.randomUUID(),
		productIds: [discountedProductId],
		percentage,
		subscriptionIds: [subscriptionProductId],
		createdAt: new Date(),
		updatedAt: new Date(),
		mode: 'percentage',
		beginsAt: subDays(new Date(), 1),
		endsAt: addDays(new Date(), 1),
		name: 'test discount',
		wholeCatalog: false
	});
}
