import { collections } from '$lib/server/database';
import { runtimeConfig } from '$lib/server/runtime-config';
import { CUSTOMER_ROLE_ID } from '$lib/types/User';
import { z } from 'zod';

export async function load() {
	const nonCustomers = await collections.users
		.find({ roleId: { $ne: CUSTOMER_ROLE_ID } })
		.sort({ _id: 1 })
		.toArray();

	return {
		users: nonCustomers.map((user) => ({
			_id: user._id.toString(),
			login: user.login,
			alias: user.alias,
			roleId: user.roleId,
			disabled: user.disabled,
			recovery: user.recovery,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt
		})),
		adminWelcomMessage: runtimeConfig.adminWelcomMessage
	};
}
export const actions = {
	updateWelcomeMessage: async function ({ request }) {
		const formData = await request.formData();

		const result = z
			.object({
				welcomMessage: z.string().max(4096)
			})
			.parse({
				welcomMessage: formData.get('welcomMessage')
			});

		await collections.runtimeConfig.updateOne(
			{ _id: 'adminWelcomMessage' },
			{ $set: { data: result.welcomMessage, updatedAt: new Date() } },
			{ upsert: true }
		);

		runtimeConfig.adminWelcomMessage = result.welcomMessage;
	}
};
