import type { Actions } from './$types';
import { generatePicture } from '$lib/server/picture';
import { redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { adminPrefix } from '$lib/server/admin';
import { TAGTYPES } from '$lib/types/Picture';
import type { JsonObject } from 'type-fest';
import { set } from '$lib/utils/set';

export const actions: Actions = {
	default: async (input) => {
		const formData = await input.request.formData();
		const json: JsonObject = {};

		for (const [key, value] of formData) {
			set(json, key, value);
		}

		const fields = z
			.object({
				productId: z.string().optional(),
				sliderId: z.string().optional(),
				tagId: z.string().optional(),
				tagType: z.enum([TAGTYPES[0], ...TAGTYPES.slice(1)]).optional(),
				pictureIds: z.string().trim().min(1).max(500).array().min(1),
				scheduleId: z.string().optional(),
				eventScheduleSlug: z.string().optional()
			})
			.parse(json);

		await generatePicture(fields.pictureIds[0], {
			productId: fields.productId || undefined,
			slider: fields.sliderId ? { _id: fields.sliderId } : undefined,
			tag: fields.tagId && fields.tagType ? { _id: fields.tagId, type: fields.tagType } : undefined,
			schedule:
				fields.scheduleId && fields.eventScheduleSlug
					? { _id: fields.scheduleId, eventSlug: fields.eventScheduleSlug }
					: undefined
		});

		if (fields.productId) {
			await Promise.all(
				fields.pictureIds.slice(1).map((pictureId) =>
					generatePicture(pictureId, {
						productId: fields.productId
					})
				)
			);
			throw redirect(303, `${adminPrefix()}/product/${fields.productId}`);
		}

		if (fields.sliderId) {
			throw redirect(303, '/admin/slider/' + fields.sliderId);
		}
		if (fields.tagId) {
			throw redirect(303, '/admin/tags/' + fields.tagId);
		}
		if (fields.scheduleId) {
			throw redirect(303, '/admin/schedule/' + fields.scheduleId);
		}

		throw redirect(303, `${adminPrefix()}/picture`);
	}
};
