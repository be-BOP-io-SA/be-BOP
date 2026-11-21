import { error } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';
import qrcode from 'qrcode';
import { terminalKeyOf } from '$lib/server/api/pos-terminal';
import { collections } from '$lib/server/database';
import { getProcessor } from '$lib/server/sdk/pp';

/** The QR code the customer scans to pay, as the processor of the payment asks to present it. */
export async function GET(event) {
	const apiKey = await terminalKeyOf(event);
	if (!apiKey || !ObjectId.isValid(event.params.id)) {
		throw error(404, 'Payment not found');
	}
	const posPayment = await collections.posPayments.findOne({ _id: new ObjectId(event.params.id) });
	if (
		!posPayment ||
		!posPayment.device.apiKeyId.equals(apiKey._id) ||
		!posPayment.payment.address
	) {
		throw error(404, 'Payment not found');
	}
	const { payment } = posPayment;
	const presentation = payment.processor
		? getProcessor(payment.processor)?.presentation
		: undefined;
	const payload = presentation?.qrPayload?.(payment) ?? payment.address ?? '';

	return new Response((await qrcode.toString(payload, { type: 'svg', margin: 1 })).trim(), {
		headers: { 'content-type': 'image/svg+xml', 'cache-control': 'no-store' }
	});
}
