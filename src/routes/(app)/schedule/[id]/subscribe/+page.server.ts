import { collections } from '$lib/server/database';
import { validateEmailOrNpub } from '$lib/server/nostr';
import { userQuery } from '$lib/server/user';
import { error, fail } from '@sveltejs/kit';

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
	addSubscription: async function ({ params, request }) {
		const data = await request.formData();

		const addressResult = validateEmailOrNpub(data.get('address'));
		if ('error' in addressResult) {
			return fail(400, { error: addressResult.error });
		}
		const address = addressResult.address;

		// The schedule is the one being visited, not the one the form names: the posted field only
		// mirrors the route, and trusting it let a single request subscribe an address to any
		// schedule, including ones that never opened subscriptions.
		const schedule = await collections.schedules.findOne(
			{ _id: params.id },
			{ projection: { allowSubscription: 1 } }
		);

		if (!schedule?.allowSubscription) {
			throw error(403, 'This schedule does not accept subscriptions');
		}

		const scheduleId = params.id;

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
