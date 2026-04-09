import { error } from '@sveltejs/kit';
import { collections } from '$lib/server/database';
import { enrichWithOrderNumbers } from '$lib/server/orders';
import type { Filter } from 'mongodb';
import type { ScheduleEventBooked } from '$lib/types/Schedule';

export const load = async ({ params, url, parent }) => {
	const { isBookingSchedule } = await parent();
	if (!isBookingSchedule) {
		throw error(404, 'System events are only available for booking schedules');
	}

	const fromRaw = url.searchParams.get('from');
	const untilRaw = url.searchParams.get('until');
	const from = fromRaw ? new Date(fromRaw) : null;
	const until = untilRaw ? new Date(untilRaw) : null;

	const filter: Filter<ScheduleEventBooked> = {
		scheduleId: params.id,
		status: 'confirmed'
	};

	if ((from && !isNaN(from.getTime())) || (until && !isNaN(until.getTime()))) {
		filter.beginsAt = {
			...(from && !isNaN(from.getTime()) ? { $gte: from } : {}),
			...(until && !isNaN(until.getTime()) ? { $lte: until } : {})
		};
	}

	const scheduleEvents = await collections.scheduleEvents
		.find(filter)
		.sort({ beginsAt: -1 })
		.limit(200)
		.toArray();

	return {
		bookings: await enrichWithOrderNumbers(scheduleEvents),
		from: fromRaw,
		until: untilRaw
	};
};
