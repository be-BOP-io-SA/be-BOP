import { error } from '@sveltejs/kit';
import { collections } from '$lib/server/database';
import { enrichWithOrderNumbers } from '$lib/server/orders';

export const load = async ({ params, url }) => {
	const productSlug = params.id.startsWith('product:') ? params.id.slice('product:'.length) : null;
	const isBookingProduct = productSlug
		? !!(await collections.products.findOne(
				{ _id: productSlug, bookingSpec: { $exists: true } },
				{ projection: { _id: 1 } }
		  ))
		: false;
	if (!isBookingProduct) {
		throw error(404, 'System events are only available for booking schedules');
	}

	const from = url.searchParams.get('from');
	const until = url.searchParams.get('until');

	const filter: Record<string, unknown> = {
		scheduleId: params.id,
		status: 'confirmed'
	};

	if (from || until) {
		filter.beginsAt = {
			...(from ? { $gte: new Date(from) } : {}),
			...(until ? { $lte: new Date(until) } : {})
		};
	}

	const scheduleEvents = await collections.scheduleEvents
		.find(filter)
		.sort({ beginsAt: -1 })
		.limit(200)
		.toArray();

	return {
		bookings: await enrichWithOrderNumbers(scheduleEvents),
		from,
		until
	};
};
