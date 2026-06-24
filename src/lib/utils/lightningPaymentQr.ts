import type { Currency } from '$lib/types/Currency';
import { toBitcoins } from './toBitcoins';

export function lightningPaymentQrCodeString(
	paymentAddress: string,
	paymentAmount: number,
	paymentCurrency: Currency
): string {
	return `lightning:${paymentAddress}?amount=${toBitcoins(paymentAmount, paymentCurrency)
		.toLocaleString('en-US', { maximumFractionDigits: 8 })
		.replaceAll(',', '')}`;
}
