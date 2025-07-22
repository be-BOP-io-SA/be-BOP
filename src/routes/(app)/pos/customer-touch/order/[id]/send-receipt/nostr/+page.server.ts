import { UrlDependency } from '$lib/types/UrlDependency.js';
import { collections } from '$lib/server/database';
import { nostrPublicKey } from '$lib/server/nostr';
import { redirect } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';

export async function load({ params, depends }) {
	depends(UrlDependency.CtiOrderNotification);
	const orderId = params.id;

	let otpCode;
	const existing = await collections.ctiOrderNotifications.findOne({
		orderId,
		'authenticationCode.expiresAt': { $gt: new Date() }
	});
	if (existing && existing.authenticationCode) {
		otpCode = existing.authenticationCode.value;
	} else {
		otpCode = crypto.getRandomValues(new Uint32Array(1))[0].toString().padStart(6, '0').slice(-6);
		const currentTime = new Date();
		await collections.ctiOrderNotifications.insertOne({
			_id: new ObjectId(),
			orderId,
			authenticationCode: {
				value: otpCode,
				expiresAt: new Date(currentTime.getTime() + 5 * 60 * 1000)
			},
			createdAt: currentTime,
			updatedAt: currentTime
		});
	}
	if (existing && existing.receiptSentAt) {
		throw redirect(303, `/pos/customer-touch/order/${orderId}?receiptSent=true`);
	}

	return {
		nostrPublicKey,
		otpCode
	};
}
