import {
	isBitcoinNodelessConfigured,
	bip84Address,
	generateDerivationIndex,
	getSatoshiReceivedNodeless,
	updateBitcoinBlockHeight
} from '$lib/server/bitcoin-nodeless';
import { runtimeConfig, runtimeConfigUpdatedAt } from '$lib/server/runtime-config';
import { toSatoshis } from '$lib/utils/toSatoshis';
import { getConfirmationBlocks } from '$lib/server/getConfirmationBlocks';
import { differenceInMinutes } from 'date-fns';
import { bitcoinPaymentPrice } from '../pp';
import type {
	PaymentProcessorDefinition,
	CreatePaymentParams,
	CreatePaymentResult,
	CheckPaymentResult
} from '../pp';
import type { Order } from '$lib/types/Order';

export default {
	meta: { processor: 'bitcoin-nodeless', method: 'bitcoin', emoji: '₿' },

	isEnabled: () => isBitcoinNodelessConfigured(),

	paymentPrice: bitcoinPaymentPrice,

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
		const address = bip84Address(
			runtimeConfig.bitcoinNodeless.publicKey,
			await generateDerivationIndex()
		);
		return { address, processor: 'bitcoin-nodeless' };
	},

	async checkPayment(
		payment: Order['payments'][number],
		order: Order
	): Promise<CheckPaymentResult> {
		if (!payment.address) {
			throw new Error('Missing address on bitcoin-nodeless payment');
		}
		if (!payment.expiresAt) {
			throw new Error('Bitcoin nodeless payment missing expiresAt');
		}

		// Rate-limited block height update (1/min)
		if (
			!runtimeConfigUpdatedAt['bitcoinBlockHeight'] ||
			differenceInMinutes(new Date(), runtimeConfigUpdatedAt['bitcoinBlockHeight']) >= 1
		) {
			await updateBitcoinBlockHeight();
		}

		const nConfirmations = getConfirmationBlocks(payment.price);
		const received = await getSatoshiReceivedNodeless(
			payment.address,
			nConfirmations,
			order.createdAt,
			payment.expiresAt
		);

		if (received.satReceived >= toSatoshis(payment.price.amount, payment.price.currency)) {
			return {
				status: 'paid',
				received: { amount: received.satReceived, currency: 'SAT' },
				transactions: received.transactions
			};
		}
		if (payment.expiresAt < new Date()) {
			return { status: 'expired' };
		}
		return { status: 'pending', transactions: received.transactions };
	}
} satisfies PaymentProcessorDefinition;
