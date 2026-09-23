import { beforeEach, describe, expect, it } from 'vitest';
import { collections } from '$lib/server/database';
import { cleanDb } from '$lib/server/test-utils';
import { TEST_DIGITAL_PRODUCT } from '$lib/server/seed/product';
import { createOrder } from '$lib/server/orders';
import { fetchOrderForUser } from './fetchOrderForUser';

const DOWNLOAD_SECRET = 'a-secret-that-must-never-reach-the-browser';

describe('fetchOrderForUser', () => {
	beforeEach(async () => {
		await cleanDb();
		await collections.products.insertOne(TEST_DIGITAL_PRODUCT);
		await collections.digitalFiles.insertOne({
			_id: 'test-digital-file',
			productId: TEST_DIGITAL_PRODUCT._id,
			name: 'manual.pdf',
			storage: { key: 'digital-files/manual.pdf', size: 1024 },
			secret: DOWNLOAD_SECRET,
			createdAt: new Date(),
			updatedAt: new Date()
		});
	});

	// The download endpoint takes this secret alone as the entitlement, so an unpaid buyer
	// reading it out of their own order page would walk around the paid-only gate.
	it('never exposes the digital file download secret', async () => {
		const orderId = await createOrder(
			[{ product: TEST_DIGITAL_PRODUCT, quantity: 1 }],
			'point-of-sale',
			{
				locale: 'en',
				user: { sessionId: 'test-session-id' },
				shippingAddress: null,
				userVatCountry: 'FR'
			}
		);

		const order = await fetchOrderForUser(orderId);

		expect(order.items[0].digitalFiles).toHaveLength(1);
		expect(JSON.stringify(order)).not.toContain(DOWNLOAD_SECRET);
		expect(JSON.stringify(order)).not.toContain('digital-files/manual.pdf');
	});
});
