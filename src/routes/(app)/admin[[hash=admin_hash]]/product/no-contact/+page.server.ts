import { collections } from '$lib/server/database';
import { contactAddressCanBeOptional, type Product } from '$lib/types/Product';
import { fail } from '@sveltejs/kit';

type ProductOption = Pick<
	Product,
	'_id' | 'name' | 'allowOrderWithoutContactAddress' | 'type' | 'shipping' | 'deposit' | 'preorder'
>;

const projection = {
	_id: 1,
	name: 1,
	allowOrderWithoutContactAddress: 1,
	type: 1,
	shipping: 1,
	deposit: 1,
	preorder: 1
} as const;

export const load = async () => {
	const products = await collections.products
		.find({})
		.project<ProductOption>(projection)
		.sort({ name: 1 })
		.toArray();

	return {
		products: products.map((product) => ({
			_id: product._id,
			name: product.name,
			allowOrderWithoutContactAddress: !!product.allowOrderWithoutContactAddress,
			canChange: contactAddressCanBeOptional(product)
		}))
	};
};

export const actions = {
	default: async function ({ request }) {
		const formData = await request.formData();
		// The products whose box could be changed when the page was displayed, and the ones ticked
		const editable = formData.getAll('editable').map(String);
		const allowed = new Set(formData.getAll('allowed').map(String));

		const products = await collections.products
			.find({ _id: { $in: editable } })
			.project<ProductOption>(projection)
			.toArray();

		// A product may have become a subscription, delivered, on deposit or on preorder since the
		// page was opened: saving would then allow it something it can no longer have.
		const noLongerEditable = editable.filter((id) => {
			const product = products.find((p) => p._id === id);
			return !product || !contactAddressCanBeOptional(product);
		});
		if (noLongerEditable.length) {
			return fail(409, {
				noLongerEditable: noLongerEditable.map(
					(id) => products.find((p) => p._id === id)?.name ?? id
				)
			});
		}

		const now = new Date();
		await collections.products.updateMany(
			{ _id: { $in: editable.filter((id) => allowed.has(id)) } },
			{ $set: { allowOrderWithoutContactAddress: true, updatedAt: now } }
		);
		await collections.products.updateMany(
			{ _id: { $in: editable.filter((id) => !allowed.has(id)) } },
			{ $set: { allowOrderWithoutContactAddress: false, updatedAt: now } }
		);

		return { success: true };
	}
};
