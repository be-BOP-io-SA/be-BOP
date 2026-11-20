import { collections } from '$lib/server/database';
import { pojo } from '$lib/server/pojo.js';
import { withWebhookSecretForEditors } from '$lib/server/paid-order-webhook-secret';
import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params, locals }) => {
	const product = await collections.products.findOne({ _id: params.id });

	if (!product) {
		throw error(404, 'Product not found');
	}
	return { product: pojo(withWebhookSecretForEditors(product, locals.user?.role)) };
};
