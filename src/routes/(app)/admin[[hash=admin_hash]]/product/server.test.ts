import { beforeEach, describe, expect, it } from 'vitest';
import { cleanDb } from '$lib/server/test-utils';
import { collections } from '$lib/server/database';
import { TEST_DIGITAL_PRODUCT } from '$lib/server/seed/product';
import { load } from './+page.server';

async function listedIds(productAttribute: string) {
	const data = await load({
		url: new URL(`http://x/admin/product?productAttribute=${productAttribute}`)
	} as Parameters<typeof load>[0]);
	return data.products.map((product) => product._id).sort();
}

describe('admin product list attribute filter', () => {
	beforeEach(async () => {
		await cleanDb();
		await collections.products.insertMany([
			{ ...TEST_DIGITAL_PRODUCT, _id: 'plain', alias: ['plain'] },
			{ ...TEST_DIGITAL_PRODUCT, _id: 'ticket', alias: ['ticket'], isTicket: true },
			{
				...TEST_DIGITAL_PRODUCT,
				_id: 'booking',
				alias: ['booking'],
				bookingSpec: { slotMinutes: 60 }
			}
		]);
	});

	it('lists only bookable products for isBookingSlot', async () => {
		expect(await listedIds('isBookingSlot')).toEqual(['booking']);
	});

	it('still filters boolean attributes', async () => {
		expect(await listedIds('isTicket')).toEqual(['ticket']);
	});

	it('lists everything without attribute', async () => {
		expect(await listedIds('')).toEqual(['booking', 'plain', 'ticket']);
	});
});
