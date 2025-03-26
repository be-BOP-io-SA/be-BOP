import { collections } from '$lib/server/database';
import { zodNpub } from '$lib/server/nostr';
import { userQuery } from '$lib/server/user';
import { error } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';
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

		const { address, scheduleId } = z
			.object({
				address: z.union([z.string().email(), zodNpub()]),
				scheduleId: z.string().min(1) // Ensure it's not empty
			})
			.parse({
				address: data.get('address'),
				scheduleId: data.get('scheduleId')
			});
		const personalInfo = await collections.personalInfo.findOne(
			userQuery({
				...(address.includes('@') && { email: address }),
				...(!address.includes('@') && { npub: address })
			})
		);

		await collections.personalInfo.updateOne(
			userQuery({
				...(address.includes('@') && { email: address }),
				...(!address.includes('@') && { npub: address })
			}),
			{
				$set: {
					...(address.includes('@') && { email: address }),
					...(!address.includes('@') && { npub: address }),
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
