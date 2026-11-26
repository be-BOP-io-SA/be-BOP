import { runtimeConfig } from '$lib/server/runtime-config';
import { bitcoinPaymentQrCodeString, type Order } from '$lib/types/Order';
import {
	definePaymentProcessor,
	type CheckPaymentResult,
	type CreatePaymentParams,
	type CreatePaymentResult
} from '$lib/server/sdk/pp';
import declaration from './declaration';
import {
	checkSattlemePayment,
	createSattlemeInvoice,
	isConnectionTest,
	isSattlemeConfigured,
	ONCHAIN_MIN_SATS,
	satsOf,
	sattlemeExpiresIn,
	sattlemeRestOf,
	testSattlemeConnection
} from '../sattleme/sattleme.server';

/**
 * The Bitcoin method through sattle.me: a deposit address of the merchant's wallet, leased for
 * this payment from the lot the merchant's app gives the integration. Its QR code is that address
 * and its amount alone: the Lightning invoice sattle.me makes as well is never shown here.
 */
export default definePaymentProcessor(declaration, {
	presentation: { kind: 'qr', qrPayload: onchainQrCode, qrLink: onchainQrCode },

	// Pending payments are still checked when the shop unticks on-chain payments.
	isEnabled: isSattlemeConfigured,

	acceptsNewPayments: () => runtimeConfig.sattleme.onchain,

	settlementCurrency: () => 'SAT',

	expiresIn: sattlemeExpiresIn,

	async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
		if (isConnectionTest(params)) {
			await testSattlemeConnection();
			return { processor: 'sattleme-onchain' };
		}

		if (satsOf(params) < ONCHAIN_MIN_SATS) {
			throw new Error(`sattle.me takes on-chain payments from ${ONCHAIN_MIN_SATS} sats`);
		}

		const invoice = await createSattlemeInvoice(params);
		if (!invoice.onchainAddress) {
			// Its Lightning invoice, declared already, expires unpaid: its reference is never reused.
			throw new Error(
				"No deposit address of the sattle.me integration's lot is free: the merchant's app fills it when it is opened"
			);
		}

		return {
			address: invoice.onchainAddress,
			invoiceId: invoice.ref,
			processor: 'sattleme-onchain',
			meta: { invoice }
		};
	},

	checkPayment(payment: Order['payments'][number], order: Order): Promise<CheckPaymentResult> {
		// The rest is paid to the same address: the QR code alone changes.
		return checkSattlemePayment(order, payment, () => null);
	}
});

/** `bitcoin:<address>?amount=…`: the price, or the rest of an underpayment while one is due. */
function onchainQrCode(payment: Order['payments'][number]): string {
	const rest = sattlemeRestOf(payment);

	return rest
		? bitcoinPaymentQrCodeString(payment.address ?? '', Number(rest.sats), 'SAT')
		: bitcoinPaymentQrCodeString(
				payment.address ?? '',
				payment.price.amount,
				payment.price.currency
		  );
}
