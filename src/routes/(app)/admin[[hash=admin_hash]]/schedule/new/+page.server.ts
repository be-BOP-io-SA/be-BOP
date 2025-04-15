import { collections } from '$lib/server/database';
import type { Actions } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { MAX_NAME_LIMIT, MAX_SHORT_DESCRIPTION_LIMIT } from '$lib/types/Product';
import { adminPrefix } from '$lib/server/admin';
import { zodSlug } from '$lib/server/zod';
import type { JsonObject } from 'type-fest';
import { set } from 'lodash-es';
import { generateId } from '$lib/utils/generateId';

export const load = async () => {};

export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const json: JsonObject = {};
		for (const [key, value] of formData) {
			set(json, key, value);
		}
		const parsed = z
			.object({
				slug: zodSlug(),
				name: z.string().trim().min(1).max(MAX_NAME_LIMIT),
				pastEventDelay: z
					.string()
					.regex(/^\d+(\.\d+)?$/)
					.default('60'),
				displayPastEvents: z.boolean({ coerce: true }).default(false),
				displayPastEventsAfterFuture: z.boolean({ coerce: true }).default(false),
				sortByEventDateDesc: z.boolean({ coerce: true }).default(false),
				allowSubscription: z.boolean({ coerce: true }).default(false),
				events: z.array(
					z.object({
						title: z.string().min(1),
						shortDescription: z.string().max(MAX_SHORT_DESCRIPTION_LIMIT).optional(),
						description: z.string().max(10000).optional(),
						beginsAt: z.string().transform((val) => new Date(val)),
						endsAt: z
							.string()
							.optional()
							.transform((val) => (val ? new Date(val) : undefined)),
						location: z
							.object({
								name: z.string(),
								link: z.string()
							})
							.optional(),
						url: z.string().optional(),
						hideFromList: z.boolean({ coerce: true }).default(false),
						calendarColor: z
							.string()
							.regex(/^#[0-9a-f]{6}$/i)
							.optional(),
						rsvp: z.object({
							target: z.string().max(100)
						})
					})
				)
			})
			.parse(json);

		if (await collections.schedules.countDocuments({ _id: parsed.slug })) {
			throw error(409, 'Schedule with same slug already exists');
		}
		const eventWithSlug = parsed.events.map((parsedEvent) => ({
			...parsedEvent,
			slug: generateId(parsedEvent.title, true)
		}));

		await collections.schedules.insertOne({
			_id: parsed.slug,
			name: parsed.name,
			pastEventDelay: Number(parsed.pastEventDelay),
			displayPastEvents: parsed.displayPastEvents,
			displayPastEventsAfterFuture: parsed.displayPastEventsAfterFuture,
			sortByEventDateDesc: parsed.sortByEventDateDesc,
			allowSubscription: parsed.allowSubscription,
			createdAt: new Date(),
			updatedAt: new Date(),
			events: eventWithSlug
		});

		throw redirect(303, `${adminPrefix()}/schedule/${parsed.slug}`);
	}
};
