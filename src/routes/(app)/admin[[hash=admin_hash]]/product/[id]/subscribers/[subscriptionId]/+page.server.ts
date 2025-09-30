import { adminPrefix } from '$lib/server/admin';
import { collections } from '$lib/server/database';
import { error, redirect } from '@sveltejs/kit';

export const actions = {
	cancel: async ({ params, request }) => {
		const subscription = await collections.paidSubscriptions.findOne({
			_id: params.subscriptionId
		});

		if (!subscription) {
			throw error(404, 'Subscription not found');
		}

		if (subscription.cancelledAt) {
			throw redirect(
				303,
				request.headers.get('referer') || `${adminPrefix()}/product/${params.id}/subscribers`
			);
		}

		await collections.paidSubscriptions.updateOne(
			{ _id: params.subscriptionId },
			{ $set: { cancelledAt: new Date() } }
		);

		throw redirect(
			303,
			request.headers.get('referer') || `${adminPrefix()}/product/${params.id}/subscribers`
		);
	}
};
