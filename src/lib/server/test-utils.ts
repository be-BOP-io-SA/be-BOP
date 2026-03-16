import { env } from '$env/dynamic/private';
import { UserIdentifier } from '$lib/types/UserIdentifier';
import { collections, connectPromise, createIndexes, db } from './database';
import { refreshPromise, runtimeConfig } from './runtime-config';
import { SATOSHIS_PER_BTC } from '$lib/types/Currency';
import { addDays, subDays } from 'date-fns';

export async function cleanDb() {
	if (!env.VITEST) {
		throw new Error('cleanDb is only available in test mode');
	}
	if (db.databaseName !== 'bootik-test') {
		throw new Error('cleanDb can only be used with the bootik-test database');
	}
	await connectPromise;
	await refreshPromise;
	await db.dropDatabase();
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
