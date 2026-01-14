import { UrlDependency } from '$lib/types/UrlDependency.js';
import { fetchOrderForUser } from '../../../../order/[id]/fetchOrderForUser.js';
import type { Actions } from './$types.js';
import { collections } from '$lib/server/database.js';
import { onOrderPaymentFailed } from '$lib/server/orders.js';
import { runtimeConfig } from '$lib/server/runtime-config.js';
import { error, redirect } from '@sveltejs/kit';
import { Kind } from 'nostr-tools';

export async function load({ params, depends, locals }) {
	depends(UrlDependency.Order);
	const order = await fetchOrderForUser(params.orderId, { userRoleId: locals.user?.roleId });
	return {
		order,
		helpRequestNpub: runtimeConfig.customerTouchInterface?.helpRequestNpub,
		helpRequestCooldownSeconds: runtimeConfig.customerTouchInterface?.helpRequestCooldownSeconds ?? 60
	};
}

export const actions: Actions = {
	abandon: async ({ params }) => {
		const order = await collections.orders.findOne({ _id: params.orderId });
		if (!order) {
			throw error(404, 'Order not found');
		}

		// Cancel all pending payments
		for (const payment of order.payments) {
			if (payment.status === 'pending') {
				await onOrderPaymentFailed(order, payment, 'canceled');
			}
		}

		throw redirect(303, '/pos/customer-touch/list/drop');
	},

	requestHelp: async ({ params, cookies }) => {
		const npub = runtimeConfig.customerTouchInterface?.helpRequestNpub;
		if (!npub) {
			throw error(400, 'Help request not configured');
		}

		const cooldownSeconds = runtimeConfig.customerTouchInterface?.helpRequestCooldownSeconds ?? 60;
		const lastHelpRequest = cookies.get('cti-help-request');

		if (lastHelpRequest) {
			const lastRequestTime = parseInt(lastHelpRequest, 10);
			const now = Date.now();
			if (now - lastRequestTime < cooldownSeconds * 1000) {
				return { success: true, alreadyRequested: true };
			}
		}

		const order = await collections.orders.findOne({ _id: params.orderId });
		if (!order) {
			throw error(404, 'Order not found');
		}

		// Insert Nostr notification
		const { ORIGIN } = await import('$env/static/private');
		await collections.nostrNotifications.insertOne({
			_id: new (await import('mongodb')).ObjectId(),
			content: `Help required by customer on CTI for order #${order.number}: ${ORIGIN}/order/${order._id}`,
			kind: Kind.EncryptedDirectMessage,
			dest: npub,
			createdAt: new Date(),
			updatedAt: new Date()
		});

		// Set cookie for cooldown
		cookies.set('cti-help-request', Date.now().toString(), {
			path: '/',
			maxAge: cooldownSeconds,
			httpOnly: true
		});

		return { success: true };
	}
};
