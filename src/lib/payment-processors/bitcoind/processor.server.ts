import {
	isBitcoinConfigured,
	getNewAddress,
	currentWallet,
	listTransactions,
	orderAddressLabel
} from '$lib/server/bitcoind';
import { toSatoshis } from '$lib/utils/toSatoshis';
import { sum } from '$lib/utils/sum';
import { getConfirmationBlocks } from '$lib/server/getConfirmationBlocks';
import { BITCOIN } from '$lib/server/sdk/presentations';
import {
	definePaymentProcessor,
	type CreatePaymentParams,
	type CreatePaymentResult,
	type CheckPaymentResult
} from '$lib/server/sdk/pp';
import type { Order } from '$lib/types/Order';
import declaration from './declaration';

export default definePaymentProcessor(declaration, {
	...BITCOIN,

	// Note: isBitcoinConfigured is a const (not a function), so we wrap it
	isEnabled: () => isBitcoinConfigured,

	async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
		const label = orderAddressLabel(params.orderId, params.paymentId);
		const address = await getNewAddress(label);
		const wallet = await currentWallet();

		return {
			address,
			wallet,
			label,
			processor: 'bitcoind'
		};
	},

	async checkPayment(
		payment: Order['payments'][number],
		order: Order // eslint-disable-line @typescript-eslint/no-unused-vars
	): Promise<CheckPaymentResult> {
		if (!payment.label) {
			throw new Error('Missing label on bitcoind payment');
		}

		const transactions = await listTransactions(payment.label);
		const confirmationBlocks = getConfirmationBlocks(payment.price);

		const confirmedTxs = transactions.filter(
			(t) => t.amount > 0 && t.confirmations >= confirmationBlocks
		);

		const receivedBTC = sum(confirmedTxs.map((t) => t.amount));
		const satReceived = toSatoshis(receivedBTC, 'BTC');

		const mappedTransactions = transactions.map((transaction) => ({
			id: transaction.txid,
			amount: transaction.amount,
			currency: 'BTC' as const
		}));

		if (satReceived >= toSatoshis(payment.price.amount, payment.price.currency)) {
			return {
				status: 'paid',
				received: {
					amount: satReceived,
					currency: 'SAT'
				},
				transactions: mappedTransactions
			};
		}

		if (payment.expiresAt && payment.expiresAt < new Date()) {
			return { status: 'expired' };
		}

		return { status: 'pending', transactions: mappedTransactions };
	}
});
