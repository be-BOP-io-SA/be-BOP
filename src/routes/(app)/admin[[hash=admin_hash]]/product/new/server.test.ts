import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClientSession } from 'mongodb';
import { collections } from '$lib/server/database';
import { cleanDb } from '$lib/server/test-utils';
import { TEST_DIGITAL_PRODUCT } from '$lib/server/seed/product';
import { actions } from './+page.server';

// Picture processing needs S3; only the product insert it wraps is under test.
vi.mock('$lib/server/picture', async () => {
	const { withTransaction } = await import('$lib/server/database');
	return {
		generatePicture: async (
			_pictureId: string,
			opts?: { cb?: (session: ClientSession) => Promise<void> }
		) => {
			const cb = opts?.cb;
			if (cb) {
				await withTransaction((session) => cb(session));
			}
		}
	};
});

function duplicateForm() {
	const body = new FormData();
	body.set('duplicateFromId', TEST_DIGITAL_PRODUCT._id);
	body.set('slug', 'duplicated-bracelet');
	body.set('name', 'Duplicated bracelet');
	body.set('description', '');
	body.set('shortDescription', '');
	body.set('priceAmount', '10');
	body.set('priceCurrency', 'EUR');
	body.set('hasVariations', 'on');
	body.set('variations[0].name', 'load');
	body.set('variations[0].value', 'load10');
	body.set('variations[0].price', '0');
	body.set('variationLabels.names[load]', 'Load');
	body.set('variationLabels.values[load][load10]', '10');
	body.set('variationFamilies[load].hiddenFromUI', 'on');
	body.set('variationFamilies[load].hiddenFromCustomer', 'on');
	body.set('variationUrlPolicy', 'ignore');
	return body;
}

function productForm(slug: string, extra: Record<string, string> = {}) {
	const body = new FormData();
	for (const [key, value] of Object.entries({
		slug,
		name: slug,
		description: '',
		shortDescription: '',
		priceAmount: '10',
		priceCurrency: 'EUR',
		...extra
	})) {
		body.set(key, value);
	}
	return body;
}

async function post(action: 'add' | 'duplicate', body: FormData) {
	try {
		await actions[action]({
			request: new Request('http://x/admin/product/new', { method: 'POST', body }),
			locals: {}
		} as Parameters<(typeof actions)['add']>[0]);
	} catch (thrown) {
		if ((thrown as { status?: number }).status !== 303) {
			throw thrown;
		}
	}
}

const addFields = { type: 'resource', 'pictureIds[0]': 'picture', tagIds: '[]' };

describe('product duplication', () => {
	beforeEach(async () => {
		await cleanDb();
		await collections.products.insertOne({ ...TEST_DIGITAL_PRODUCT });
	});

	it('keeps the variation family options and the URL policy', async () => {
		await Promise.resolve(
			actions.duplicate({
				request: new Request('http://x/admin/product/new?/duplicate', {
					method: 'POST',
					body: duplicateForm()
				}),
				locals: {}
			} as Parameters<typeof actions.duplicate>[0])
		).catch((thrown: { status?: number }) => {
			// The action ends with a redirect to the new product's admin page.
			if (thrown?.status !== 303) {
				throw thrown;
			}
		});

		const duplicated = await collections.products.findOne({ _id: 'duplicated-bracelet' });
		expect(duplicated?.variationFamilies).toEqual({
			load: { hiddenFromUI: true, hiddenFromCustomer: true }
		});
		expect(duplicated?.variationUrlPolicy).toBe('ignore');
	});
});

describe('product creation', () => {
	beforeEach(cleanDb);

	it('stores no booking spec when adding a product without one', async () => {
		await post('add', productForm('plain-mug', addFields));

		const stored = await collections.products.findOne({ _id: 'plain-mug' });
		expect(stored?.name).toBe('plain-mug');
		expect(stored).not.toHaveProperty('bookingSpec');
	});

	it('stores the booking spec of a bookable product', async () => {
		await post(
			'add',
			productForm('meeting-room', {
				...addFields,
				'bookingSpec.slotMinutes': '60',
				'bookingSpec.schedule.timezone': 'Europe/Paris'
			})
		);

		const stored = await collections.products.findOne({ _id: 'meeting-room' });
		expect(stored?.bookingSpec?.slotMinutes).toBe(60);
	});

	it('stores no booking spec when duplicating a product without one', async () => {
		await collections.products.insertOne({ ...TEST_DIGITAL_PRODUCT, _id: 'source' });

		await post('duplicate', productForm('copy', { duplicateFromId: 'source' }));

		const stored = await collections.products.findOne({ _id: 'copy' });
		expect(stored?.name).toBe('copy');
		expect(stored).not.toHaveProperty('bookingSpec');
	});

	it('stores the booking spec when duplicating a bookable product', async () => {
		await collections.products.insertOne({ ...TEST_DIGITAL_PRODUCT, _id: 'source' });

		await post(
			'duplicate',
			productForm('room-copy', {
				duplicateFromId: 'source',
				'bookingSpec.slotMinutes': '60',
				'bookingSpec.schedule.timezone': 'Europe/Paris'
			})
		);

		const stored = await collections.products.findOne({ _id: 'room-copy' });
		expect(stored?.bookingSpec?.slotMinutes).toBe(60);
	});
});
