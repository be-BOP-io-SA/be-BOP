import { beforeEach, describe, expect, it } from 'vitest';
import { collections } from '$lib/server/database';
import { cleanDb } from '$lib/server/test-utils';
import { TEST_DIGITAL_PRODUCT } from '$lib/server/seed/product';
import { actions } from './+page.server';

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

describe('product duplication', () => {
	beforeEach(async () => {
		await cleanDb();
		await collections.products.insertOne({ ...TEST_DIGITAL_PRODUCT });
	});

	it('keeps the variation family options and the URL policy', async () => {
		await actions
			.duplicate({
				request: new Request('http://x/admin/product/new?/duplicate', {
					method: 'POST',
					body: duplicateForm()
				}),
				locals: {}
			} as Parameters<typeof actions.duplicate>[0])
			.catch((thrown) => {
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
