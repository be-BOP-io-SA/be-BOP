import { collections } from '$lib/server/database';
import { redirect } from '@sveltejs/kit';

export const actions = {
	nostr: async ({ params, url }) => {
		await collections.ctiOrderNotifications.updateMany(
			{ 'authenticationCode.expiresAt': { $gt: new Date() }, orderId: params.id },
			{ $set: { 'authenticationCode.expiresAt': new Date() } }
		);
		throw redirect(303, `${url.pathname}/nostr`);
	}
};
