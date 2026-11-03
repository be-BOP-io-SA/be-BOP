import { beforeEach, describe, expect, it } from 'vitest';
import { collections } from '$lib/server/database';
import { cleanDb } from '$lib/server/test-utils';
import { TEST_DIGITAL_PRODUCT } from '$lib/server/seed/product';
import { actions } from './+page.server';

const productId = TEST_DIGITAL_PRODUCT._id;

function updateForm(entries: Record<string, string>) {
	const body = new FormData();
	for (const [key, value] of Object.entries({
		name: 'Bracelet',
		description: '',
		shortDescription: '',
		priceAmount: '10',
		priceCurrency: 'EUR',
		tagIds: '[]',
		hasVariations: 'on',
		'variationLabels.names[load]': 'Load',
		...entries
	})) {
		body.set(key, value);
	}
	return body;
}

function update(body: FormData) {
	return actions.update({
		request: new Request(`http://x/admin/product/${productId}?/update`, { method: 'POST', body }),
		params: { id: productId },
		locals: {}
	} as unknown as Parameters<typeof actions.update>[0]);
}

describe('product update', () => {
	beforeEach(async () => {
		await cleanDb();
		await collections.products.insertOne({
			...TEST_DIGITAL_PRODUCT,
			hasVariations: true,
			variations: [{ name: 'load', value: 'load10', price: 0 }],
			variationLabels: { names: { load: 'Load' }, values: { load: { load10: '10' } } },
			translations: {
				fr: {
					variationLabels: { names: { load: 'Charge' }, values: { load: { load10: 'Dix' } } }
				}
			}
		});
	});

	it('moves the translated label when a value id is renamed', async () => {
		await update(
			updateForm({
				'variations[0].name': 'load',
				'variations[0].value': 'b-0042',
				'variations[0].price': '0',
				'variationLabels.values[load][b-0042]': '10',
				'variationValueRenames[load][load10]': 'b-0042'
			})
		);

		const product = await collections.products.findOne({ _id: productId });
		expect(product?.variations).toEqual([{ name: 'load', value: 'b-0042', price: 0 }]);
		expect(product?.translations?.fr?.variationLabels?.values.load).toEqual({ 'b-0042': 'Dix' });
	});
});
