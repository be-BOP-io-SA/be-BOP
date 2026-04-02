import {
	isSwissBitcoinPayConfigured,
	sbpCreateCheckout,
	sbpGetCheckoutStatus
} from '$lib/server/swiss-bitcoin-pay';
import { toSatoshis } from '$lib/utils/toSatoshis';
import { runtimeConfig } from '$lib/server/runtime-config';
import { CURRENCIES } from '$lib/types/Currency';
import { typedInclude } from '$lib/utils/typedIncludes';
import { differenceInMinutes } from 'date-fns';
import { lightningPaymentPrice, lightningLabel } from '../pp';
import type {
	PaymentProcessorDefinition,
	CreatePaymentParams,
	CreatePaymentResult,
	CheckPaymentResult
} from '../pp';
import type { Order } from '$lib/types/Order';

export default {
	meta: { processor: 'swiss-bitcoin-pay', method: 'lightning', emoji: '⚡' },

	isEnabled: () => isSwissBitcoinPayConfigured(),

	paymentPrice: lightningPaymentPrice,

	async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
		const satoshis = toSatoshis(params.toPay.amount, params.toPay.currency);
		const label = lightningLabel(params.orderId, params.orderNumber);
		const checkout = await sbpCreateCheckout({
			title: label,
			description: `Order #${params.orderNumber}`,
			amount: satoshis,
			unit: 'sat',
			extra: { customDevice: runtimeConfig.brandName },
			...(params.expiresAt && {
				delay: differenceInMinutes(params.expiresAt, new Date())
			})
		});
		return {
			address: checkout.pr,
			invoiceId: checkout.id,
			processor: 'swiss-bitcoin-pay'
		};
	},

	async checkPayment(
		payment: Order['payments'][number],
		order: Order // eslint-disable-line @typescript-eslint/no-unused-vars
	): Promise<CheckPaymentResult> {
		if (!payment.invoiceId) {
			throw new Error('Missing invoice ID on swiss-bitcoin-pay payment');
		}
		const status = await sbpGetCheckoutStatus(payment.invoiceId);
		if (status.isPaid) {
			let currency = status.unit?.toUpperCase();
			let amount = status.amount;
			// Workaround: undocumented behaviour in Swiss Bitcoin Pay
			if (currency === undefined && status.fiatUnit === 'sat') {
				currency = 'SAT';
				amount = status.fiatAmount;
			}
			if (!typedInclude(CURRENCIES, currency)) {
				throw new Error(`SBP invoice ${payment.invoiceId} paid in unexpected currency ${currency}`);
			}
			return { status: 'paid', received: { amount, currency } };
		}
		if (status.isExpired) {
			return { status: 'expired' };
		}
		return { status: 'pending' };
	}
} satisfies PaymentProcessorDefinition;
