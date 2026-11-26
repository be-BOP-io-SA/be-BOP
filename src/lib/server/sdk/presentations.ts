import { bitcoinPaymentQrCodeString, lightningPaymentQrCodeString } from '$lib/types/Order';
import type { Order } from '$lib/types/Order';
import type { Currency } from '$lib/types/Currency';
import { runtimeConfig } from '$lib/server/runtime-config';
import { ORIGIN } from '$lib/server/env-config';
import { MANUAL_PRESENTATION, type PaymentPresentation } from './pp';

/**
 * What processors of a same family share. It lives here rather than in `pp.ts` so the
 * interface itself names no particular payment protocol: a card, a wire or a mobile-money
 * processor has no reason to load a BIP21 encoder to implement it.
 */

/** What every hand-settled processor shares: nothing to scan, paid in the shop's own currency. */
export const MANUAL = {
	presentation: MANUAL_PRESENTATION,
	settlementCurrency: (): Currency => runtimeConfig.mainCurrency
};

export const LIGHTNING_PRESENTATION: PaymentPresentation = {
	kind: 'qr',
	qrLink: (payment) => lightningPaymentQrCodeString(payment.address ?? '')
};

/** What every Lightning processor shares: an invoice shown as a QR code, asked for in satoshis. */
export const LIGHTNING = {
	presentation: LIGHTNING_PRESENTATION,
	settlementCurrency: (): Currency => 'SAT'
};

export const BITCOIN_PRESENTATION: PaymentPresentation = {
	kind: 'qr',
	// Both the image and the link read the same settled amount, in the same currency.
	qrPayload: (payment) => bitcoinQrCode(payment),
	qrLink: (payment) => bitcoinQrCode(payment)
};

/** What every on-chain processor shares: an address shown as a QR code, asked for in bitcoins. */
export const BITCOIN = {
	presentation: BITCOIN_PRESENTATION,
	settlementCurrency: (): Currency => 'BTC'
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
