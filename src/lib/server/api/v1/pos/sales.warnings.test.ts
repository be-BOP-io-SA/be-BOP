import { beforeEach, describe, expect, it } from 'vitest';
import { ObjectId } from 'mongodb';
import { cleanDb } from '$lib/server/test-utils';
import { collections } from '$lib/server/database';
import { runtimeConfig } from '$lib/server/runtime-config';
import { TEST_DIGITAL_PRODUCT } from '$lib/server/seed/product';
import { amountToMinor } from '../orders/money';
import type { AuthenticatedApiKey } from '$lib/types/ApiV1';
import { ingestPosSales } from './sales';
import type { PosSale } from './schemas';

const apiKey: AuthenticatedApiKey = {
	_id: new ObjectId(),
	name: 'till',
	scopes: ['pos:write'],
	keyPrefix: 'bebop_ak_test_warn0001'
};

function sale(externalOrderId: string, extra?: Partial<PosSale>): PosSale {
	const price = {
		amountMinor: amountToMinor(TEST_DIGITAL_PRODUCT.price.amount, 'EUR'),
		currency: 'EUR'
	};
	return {
		externalOrderId,
		soldAt: new Date().toISOString(),
		method: 'cashless',
		totalPrice: price,
		items: [{ product: TEST_DIGITAL_PRODUCT._id, quantity: 1, price }],
		...extra
	} as PosSale;
}

async function results(apiKeyUsed: AuthenticatedApiKey, sales: PosSale[]) {
	const outcome = await ingestPosSales({ apiKey: apiKeyUsed, sales });
	if (!('response' in outcome)) {
		throw new Error('expected the sales to be ingested');
	}
	return outcome.response.results;
}

describe('warnings on the sales a till pushes', () => {
	beforeEach(async () => {
		await cleanDb();
		await collections.products.insertOne({ ...TEST_DIGITAL_PRODUCT });
		const now = new Date();
		await collections.posPaymentSubtypes.insertOne({
			_id: new ObjectId(),
			slug: 'cashless',
			name: 'Cashless',
			sortOrder: 0,
			createdAt: now,
			updatedAt: now
		});
		apiKey._id = new ObjectId();
		runtimeConfig.mainCurrency = 'EUR';
		runtimeConfig.secondaryCurrency = 'USD';
		runtimeConfig.vatExempted = true;
	}, 60_000);

	it('tells the till that its key may not turn notifications off', async () => {
		const [result] = await results(apiKey, [sale('quiet-1', { notifications: false })]);

		expect(result.status).toBe('success');
		expect(result.warnings?.map((warning) => warning.code)).toEqual(['NOTIFICATIONS_NOT_DISABLED']);
	});

	it('leaves the field out of a sale that has nothing to report', async () => {
		const [result] = await results(apiKey, [sale('plain-1')]);

		expect(result.status).toBe('success');
		expect(result).not.toHaveProperty('warnings');
	});

	it('gives no warning to a key that may turn notifications off', async () => {
		const allowed = { ...apiKey, canDisableNotifications: true };

		const [result] = await results(allowed, [sale('allowed-1', { notifications: false })]);

		expect(result).not.toHaveProperty('warnings');
	});
});
