import { collections } from '$lib/server/database';
import { BOOKABLE_PRODUCT_FILTER } from '$lib/server/product';
import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params }) => {
	const schedule = await collections.schedules.findOne({ _id: params.id });

	if (!schedule) {
		throw error(404, 'schedule not found');
	}
	const productSlug = params.id.startsWith('product:') ? params.id.slice('product:'.length) : null;
	const isBookingSchedule = productSlug
		? !!(await collections.products.findOne(
				{ _id: productSlug, ...BOOKABLE_PRODUCT_FILTER },
				{ projection: { _id: 1 } }
		  ))
		: false;

	return {
		schedule,
		isBookingSchedule
	};
};
