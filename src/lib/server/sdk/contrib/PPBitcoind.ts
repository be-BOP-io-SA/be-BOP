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
import { bitcoinPaymentPrice } from '../pp';
import type {
	PaymentProcessorDefinition,
	CreatePaymentParams,
	CreatePaymentResult,
	CheckPaymentResult
} from '../pp';
import type { Order } from '$lib/types/Order';

export default {
	meta: { processor: 'bitcoind', method: 'bitcoin', emoji: '₿' },

	// Note: isBitcoinConfigured is a const (not a function), so we wrap it
	isEnabled: () => isBitcoinConfigured,

	paymentPrice: bitcoinPaymentPrice,

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
} satisfies PaymentProcessorDefinition;
