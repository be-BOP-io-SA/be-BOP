import { collections } from '$lib/server/database';
import { validateEmailOrNpub } from '$lib/server/nostr';
import { availableContactModes } from '$lib/server/contact-modes';
import { contactModesOrEmail } from '$lib/types/ContactMode';
import { userQuery } from '$lib/server/user';
import { error, fail } from '@sveltejs/kit';
import { z } from 'zod';

export const load = async ({ params }) => {
	const schedule = await collections.schedules.findOne({ _id: params.id });

	if (!schedule) {
		throw error(404, 'schedule not found');
	}
	const pictures = await collections.pictures
		.find({ 'schedule._id': params.id })
		.sort({ createdAt: 1 })
		.toArray();
	return {
		schedule,
		pictures
	};
};

export const actions = {
	addSubscription: async function ({ request }) {
		const data = await request.formData();

		const addressResult = validateEmailOrNpub(
			data.get('address'),
			contactModesOrEmail(availableContactModes())
		);
		if ('error' in addressResult) {
			return fail(400, { error: addressResult.error });
		}
		const contact =
			addressResult.kind === 'email'
				? { email: addressResult.address }
				: { npub: addressResult.address };
		const { scheduleId } = z
			.object({
				scheduleId: z.string().min(1)
			})
			.parse({
				scheduleId: data.get('scheduleId')
			});
		const personalInfo = await collections.personalInfo.findOne(userQuery(contact));

		await collections.personalInfo.updateOne(
			userQuery(contact),
			{
				$set: {
					...contact,
					subscribedSchedule: personalInfo?.subscribedSchedule
						? [...new Set([...personalInfo.subscribedSchedule, scheduleId])]
						: [scheduleId],
					updatedAt: new Date()
				},
				$setOnInsert: { createdAt: new Date() }
			},
			{
				upsert: true
			}
		);

		return { success: true };
	}
};
