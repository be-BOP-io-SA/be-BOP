import { collections } from '$lib/server/database';
import { error, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { adminPrefix } from '$lib/server/admin';
import { MAX_NAME_LIMIT, MAX_SHORT_DESCRIPTION_LIMIT } from '$lib/types/Product';
import { set } from 'lodash-es';
import type { JsonObject } from 'type-fest';
import { generateId } from '$lib/utils/generateId';
import { deletePicture } from '$lib/server/picture';

export const load = async ({ params }) => {
	const pictures = await collections.pictures
		.find({ 'schedule._id': params.id })
		.sort({ createdAt: 1 })
		.toArray();

	return {
		pictures
	};
};

export const actions = {
	update: async function ({ request, params }) {
		const schedule = await collections.schedules.findOne({
			_id: params.id
		});

		if (!schedule) {
			throw error(404, 'Schedule not found');
		}
		const data = await request.formData();
		const json: JsonObject = {};
		for (const [key, value] of data) {
			set(json, key, value);
		}
		const parsed = z
			.object({
				name: z.string().trim().min(1).max(MAX_NAME_LIMIT),
				pastEventDelay: z
					.string()
					.regex(/^\d+(\.\d+)?$/)
					.default('60'),
				displayPastEvents: z.boolean({ coerce: true }).default(false),
				displayPastEventsAfterFuture: z.boolean({ coerce: true }).default(false),
				sortByEventDateDesc: z.boolean({ coerce: true }).default(false),
				events: z.array(
					z.object({
						title: z.string().min(1),
						slug: z.string().min(1).optional(),
						shortDescription: z.string().max(MAX_SHORT_DESCRIPTION_LIMIT).optional(),
						description: z.string().max(10000).optional(),
						beginsAt: z.date({ coerce: true }),
						endsAt: z.date({ coerce: true }),
						location: z
							.object({
								name: z.string(),
								link: z.string()
							})
							.optional(),
						url: z.string().optional(),
						unavailabity: z
							.object({
								label: z.enum(['postponed', 'canceled', 'soldOut']),
								isUnavailable: z.boolean({ coerce: true }).default(false)
							})
							.optional(),
						isArchived: z.boolean({ coerce: true }).default(false).optional()
					})
				)
			})
			.parse(json);
		const eventWithSlug = parsed.events.map((parsedEvent) => ({
			...parsedEvent,
			slug: parsedEvent.slug || generateId(parsedEvent.title, true)
		}));
		await collections.schedules.updateOne(
			{
				_id: schedule._id
			},
			{
				$set: {
					name: parsed.name,
					pastEventDelay: Number(parsed.pastEventDelay),
					displayPastEvents: parsed.displayPastEvents,
					displayPastEventsAfterFuture: parsed.displayPastEventsAfterFuture,
					sortByEventDateDesc: parsed.sortByEventDateDesc,
					updatedAt: new Date(),
					events: eventWithSlug
				}
			}
		);
	},

	delete: async function ({ params }) {
		for await (const picture of collections.pictures.find({ 'schedule._id': params.id })) {
			await deletePicture(picture._id);
		}

		await collections.schedules.deleteOne({
			_id: params.id
		});

		throw redirect(303, `${adminPrefix()}/schedule`);
	}
};
