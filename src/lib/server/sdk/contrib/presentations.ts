import { bitcoinPaymentQrCodeString, lightningPaymentQrCodeString } from '$lib/types/Order';
import type { Order } from '$lib/types/Order';
import { runtimeConfig } from '$lib/server/runtime-config';
import { ORIGIN } from '$lib/server/env-config';
import type { PaymentPresentation } from '../pp';

/**
 * Presentations and label helpers for the crypto processors. They live here rather than in
 * `pp.ts` so the interface itself names no particular payment protocol: a card, a wire or a
 * mobile-money processor has no reason to load a BIP21 encoder to implement it.
 */

export const LIGHTNING_PRESENTATION: PaymentPresentation = {
	kind: 'qr',
	qrLink: (payment) => lightningPaymentQrCodeString(payment.address ?? '')
};

export const BITCOIN_PRESENTATION: PaymentPresentation = {
	kind: 'qr',
	// Both the image and the link read the same settled amount, in the same currency.
	qrPayload: (payment) => bitcoinQrCode(payment),
	qrLink: (payment) => bitcoinQrCode(payment)
};

function bitcoinQrCode(payment: Order['payments'][number]): string {
	return bitcoinPaymentQrCodeString(
		payment.address ?? '',
		payment.price.amount,
		payment.price.currency
	);
}

export function lightningLabel(orderId: string, orderNumber: number): string {
	switch (runtimeConfig.lightningQrCodeDescription) {
		case 'brand':
			return runtimeConfig.brandName;
		case 'orderUrl':
			return `${ORIGIN}/order/${orderId}`;
		case 'brandAndOrderNumber':
			return `${runtimeConfig.brandName} - Order #${orderNumber.toLocaleString('en')}`;
		default:
			return '';
	}
}
