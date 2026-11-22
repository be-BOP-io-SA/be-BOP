import { randomBytes } from 'node:crypto';
import { ObjectId } from 'mongodb';
import { collections } from './database';
import { runtimeConfig } from './runtime-config';
import { paymentMethodExpiration } from './orders';
import { coversPayment, getProcessor, resolveProcessor } from './sdk/pp';
import type { PaymentMethod } from './payment-methods';
import type { Order, OrderPayment, Price } from '$lib/types/Order';
import type { PosPayment } from '$lib/types/PosPayment';
import { CURRENCY_UNIT, FRACTION_DIGITS_PER_CURRENCY, type Currency } from '$lib/types/Currency';
import { Kind } from 'nostr-tools';
import { ORIGIN } from './env-config';
import { queueEmail } from './email';
import { toCurrency } from '$lib/utils/toCurrency';
import {
	cancelCardPresentIntent,
	createCardPresentIntent,
	isStripeTerminalReady
} from './stripe-terminal';
import { checkPaypalPosCheckout, createPaypalPosCheckout, isPaypalPosReady } from './paypal-pos';
import { logAccountingEvent } from './accounting-log';
import type { AccountingLog } from '$lib/types/AccountingLog';

/** The operator of a payment, as the accounting journal names its employee. */
const employeeOf = (posPayment: Pick<PosPayment, 'operator'>): Pick<AccountingLog, 'employee'> =>
	posPayment.operator
		? { employee: { userId: posPayment.operator.userId, alias: posPayment.operator.alias } }
		: {};

/**
 * The methods a terminal offers, in this order, when a processor serves them with a QR code. Card
 * payments go through Tap to Pay on the device, which is not a QR code.
 */
const TERMINAL_METHODS = [
	'lightning',
	'bitcoin',
	'taler'
] as const satisfies readonly PaymentMethod[];

export function terminalPaymentMethods(): PaymentMethod[] {
	const qrMethods: PaymentMethod[] = TERMINAL_METHODS.filter(
		(method) => resolveProcessor(method)?.presentation?.kind === 'qr'
	);
	// PayPal shows the QR of its approval page, paid on the customer's phone (see paypal-pos).
	const withPaypal: PaymentMethod[] = isPaypalPosReady() ? [...qrMethods, 'paypal'] : qrMethods;
	// A card is taken with Tap to Pay on the device, through the shop's Stripe account.
	return isCardOnTerminalReady() ? [...withPaypal, 'card'] : withPaypal;
}

function isCardOnTerminalReady(): boolean {
	return !!getProcessor('stripe')?.isEnabled() && isStripeTerminalReady();
}

async function nextPosPaymentNumber(): Promise<number> {
	const res = await collections.runtimeConfig.findOneAndUpdate(
		{ _id: 'posPaymentNumber' },
		{ $inc: { data: 1 as never } },
		{ upsert: true, returnDocument: 'after' }
	);
	if (!res.value) {
		throw new Error('Failed to increment the PoS payment number');
	}
	return res.value.data as number;
}

/** The amount in each of the shop's currencies, at the rate of the moment. */
function snapshotOf(price: Price): OrderPayment['currencySnapshot'] {
	const at = (currency: Currency): Price => ({
		amount: toCurrency(currency, price.amount, price.currency),
		currency
	});
	return {
		main: { price: at(runtimeConfig.mainCurrency) },
		priceReference: { price: at(runtimeConfig.priceReferenceCurrency) },
		...(runtimeConfig.secondaryCurrency && {
			secondary: { price: at(runtimeConfig.secondaryCurrency) }
		}),
		...(runtimeConfig.accountingCurrency && {
			accounting: { price: at(runtimeConfig.accountingCurrency) }
		})
	};
}

export class PosPaymentError extends Error {}

/** Asks the processor of `method` for a payment of the sale plus the tip, and records it. */
export async function createPosPayment(params: {
	device: PosPayment['device'];
	operator?: PosPayment['operator'];
	amount: number;
	tip: number;
	method: PaymentMethod;
	externalRef?: string;
}): Promise<PosPayment> {
	if (!terminalPaymentMethods().includes(params.method)) {
		throw new PosPaymentError(`Payment method ${params.method} is not available on terminals`);
	}
	const pp =
		params.method === 'card'
			? getProcessor('stripe')
			: params.method === 'paypal'
			? getProcessor('paypal')
			: resolveProcessor(params.method);
	if (!pp) {
		throw new PosPaymentError(`No payment processor available for ${params.method}`);
	}

	const main = runtimeConfig.mainCurrency;
	const total: Price = { amount: params.amount + params.tip, currency: main };
	const settlement = pp.settlementCurrency();
	const price: Price = {
		amount: toCurrency(settlement, total.amount, total.currency),
		currency: settlement
	};

	const _id = new ObjectId();
	const paymentId = new ObjectId();
	const number = await nextPosPaymentNumber();
	const expiresAt = paymentMethodExpiration(params.method);
	const receiptToken = randomBytes(16).toString('base64url');
	const result =
		params.method === 'paypal'
			? await createPaypalPosCheckout({
					toPay: price,
					number,
					returnUrl: posReceiptUrl({ receiptToken })
			  })
			: params.method === 'card'
			? await createCardPresentIntent({
					amountMinor: Math.round(price.amount / CURRENCY_UNIT[price.currency]),
					currency: price.currency,
					metadata: { posPaymentId: _id.toHexString(), paymentId: paymentId.toHexString() },
					description: `PoS payment ${number}`
			  }).then((intent) => ({ checkoutId: intent.id, clientSecret: intent.clientSecret }))
			: await pp.createPayment({
					orderId: _id.toHexString(),
					orderNumber: number,
					paymentId: paymentId.toHexString(),
					toPay: price,
					expiresAt
			  });

	const now = new Date();
	const externalRef = params.externalRef?.trim();
	const posPayment: PosPayment = {
		_id,
		number,
		receiptToken,
		amount: { amount: params.amount, currency: main },
		tip: { amount: params.tip, currency: main },
		...(externalRef ? { externalRef } : { noExternalRef: true }),
		device: params.device,
		...(params.operator && { operator: params.operator }),
		payment: {
			_id: paymentId,
			status: 'pending',
			price,
			currencySnapshot: snapshotOf(price),
			method: params.method,
			processor: pp.meta.processor,
			...(expiresAt && { expiresAt }),
			createdAt: now,
			...('address' in result && result.address && { address: result.address }),
			...('invoiceId' in result && result.invoiceId && { invoiceId: result.invoiceId }),
			...(result.checkoutId && { checkoutId: result.checkoutId }),
			...('clientSecret' in result && result.clientSecret && { clientSecret: result.clientSecret }),
			...('wallet' in result && result.wallet && { wallet: result.wallet }),
			...('label' in result && result.label && { label: result.label })
		},
		createdAt: now,
		updatedAt: now
	};
	await collections.posPayments.insertOne(posPayment);
	await logAccountingEvent({
		eventType: 'paymentCall',
		before: null,
		after: {
			number,
			method: params.method,
			processor: pp.meta.processor,
			paymentId: paymentId.toString(),
			amount: posPayment.amount,
			tip: posPayment.tip,
			price,
			externalRef: posPayment.externalRef ?? null,
			device: params.device.name
		},
		objectId: _id.toString(),
		objectType: 'posPayment',
		origin: 'pos',
		...employeeOf(posPayment)
	});
	return posPayment;
}

/**
 * Asks the processor where a pending payment stands and records what changed. The processor reads
 * the payment as an order payment; of the order it only ever reads the id and the creation date.
 */
export async function checkPosPayment(posPayment: PosPayment): Promise<PosPayment> {
	const { payment } = posPayment;
	if (payment.status !== 'pending' || !payment.processor) {
		return posPayment;
	}
	const pp = getProcessor(payment.processor);
	if (!pp?.checkPayment || !pp.isEnabled()) {
		return posPayment;
	}

	const carrier = { _id: posPayment._id.toHexString(), createdAt: posPayment.createdAt };
	const result =
		payment.method === 'paypal'
			? await checkPaypalPosCheckout(payment)
			: await pp.checkPayment(payment, carrier as unknown as Order);
	const now = new Date();

	switch (result.status) {
		case 'paid': {
			if (!coversPayment(pp, payment, result.received, result.fees)) {
				return posPayment;
			}
			const receivedInPrice = toCurrency(
				payment.price.currency,
				result.received.amount,
				result.received.currency
			);
			const extra = receivedInPrice - payment.price.amount;
			const extraInMain = toCurrency(runtimeConfig.mainCurrency, extra, payment.price.currency);
			// At least one unit of the main currency: an overpayment the terminal has to settle.
			const overpaid = extraInMain >= CURRENCY_UNIT[runtimeConfig.mainCurrency];
			const update: Partial<PosPayment> = {
				payment: {
					...payment,
					status: 'paid',
					paidAt: now,
					received: result.received,
					...(result.fees && { fees: result.fees }),
					...(result.transactions && { transactions: result.transactions }),
					currencySnapshot: {
						...payment.currencySnapshot,
						main: {
							...payment.currencySnapshot.main,
							received: {
								amount: toCurrency(
									runtimeConfig.mainCurrency,
									result.received.amount,
									result.received.currency
								),
								currency: runtimeConfig.mainCurrency
							}
						}
					},
					awaitingConfirmation: false
				},
				...(overpaid && {
					overpayment: { amount: { amount: extraInMain, currency: runtimeConfig.mainCurrency } }
				}),
				updatedAt: now
			};
			const settled = await collections.posPayments.updateOne(
				{ _id: posPayment._id, 'payment.status': 'pending' },
				{ $set: update }
			);
			if (settled.modifiedCount) {
				await logAccountingEvent({
					eventType: 'paymentDone',
					before: { status: 'pending' },
					after: {
						status: 'paid',
						number: posPayment.number,
						method: payment.method,
						paymentId: payment._id.toString(),
						amount: posPayment.amount,
						tip: posPayment.tip,
						received: result.received,
						...(update.overpayment && { overpayment: update.overpayment.amount }),
						transactionId: result.transactions?.[0]?.id ?? payment.invoiceId ?? null
					},
					objectId: posPayment._id.toString(),
					objectType: 'posPayment',
					origin: 'pos',
					...employeeOf(posPayment)
				});
			}
			return { ...posPayment, ...update };
		}
		case 'expired':
		case 'failed':
		case 'canceled': {
			await collections.posPayments.updateOne(
				{ _id: posPayment._id, 'payment.status': 'pending' },
				{ $set: { 'payment.status': result.status, updatedAt: now } }
			);
			return { ...posPayment, payment: { ...payment, status: result.status } };
		}
		case 'pending': {
			const awaitingConfirmation = !!result.provisional;
			const missing = result.state?.mempoolMissingSince;
			const mempoolMissingSince = missing instanceof Date ? missing : undefined;
			if (
				(payment.awaitingConfirmation ?? false) !== awaitingConfirmation ||
				(payment.mempoolMissingSince?.getTime() ?? null) !==
					(mempoolMissingSince?.getTime() ?? null)
			) {
				await collections.posPayments.updateOne(
					{ _id: posPayment._id },
					mempoolMissingSince
						? {
								$set: {
									'payment.awaitingConfirmation': awaitingConfirmation,
									'payment.mempoolMissingSince': mempoolMissingSince
								}
						  }
						: {
								$set: { 'payment.awaitingConfirmation': awaitingConfirmation },
								$unset: { 'payment.mempoolMissingSince': 1 }
						  }
				);
			}
			return {
				...posPayment,
				payment: { ...payment, awaitingConfirmation, mempoolMissingSince }
			};
		}
	}
}

/** The terminal's answer to an overpayment: keep it as a tip, or record that it was refunded. */
export async function settleOverpayment(
	posPayment: PosPayment,
	treatment: 'tip' | 'refund'
): Promise<void> {
	if (!posPayment.overpayment || posPayment.overpayment.treatment) {
		return;
	}
	const now = new Date();
	const settled = await collections.posPayments.updateOne(
		{ _id: posPayment._id, 'overpayment.treatment': { $exists: false } },
		{
			$set: {
				'overpayment.treatment': treatment,
				'overpayment.decidedAt': now,
				...(treatment === 'tip' && {
					tip: {
						amount: posPayment.tip.amount + posPayment.overpayment.amount.amount,
						currency: posPayment.tip.currency
					}
				}),
				updatedAt: now
			}
		}
	);
	if (settled.modifiedCount) {
		await logAccountingEvent({
			eventType: 'posPaymentUpdate',
			before: { tip: posPayment.tip },
			after: {
				tip:
					treatment === 'tip'
						? {
								amount: posPayment.tip.amount + posPayment.overpayment.amount.amount,
								currency: posPayment.tip.currency
						  }
						: posPayment.tip,
				overpayment: posPayment.overpayment.amount,
				treatment
			},
			objectId: posPayment._id.toString(),
			objectType: 'posPayment',
			origin: 'pos',
			...employeeOf(posPayment)
		});
	}
}

/** The operator gives up on a payment still waiting: the terminal can take a new one. */
export async function cancelPosPayment(
	posPayment: PosPayment,
	by?: PosPayment['operator']
): Promise<void> {
	const canceled = await collections.posPayments.updateOne(
		{ _id: posPayment._id, 'payment.status': 'pending' },
		{ $set: { 'payment.status': 'canceled', updatedAt: new Date() } }
	);
	if (canceled.modifiedCount) {
		// A card the customer taps after this would still be charged by Stripe otherwise.
		if (posPayment.payment.method === 'card' && posPayment.payment.checkoutId) {
			await cancelCardPresentIntent(posPayment.payment.checkoutId).catch((err) =>
				console.error(`Stripe PaymentIntent of PoS payment ${posPayment.number} not canceled`, err)
			);
		}
		await logAccountingEvent({
			eventType: 'paymentCancel',
			before: { status: 'pending' },
			after: { status: 'canceled', number: posPayment.number },
			objectId: posPayment._id.toString(),
			objectType: 'posPayment',
			origin: 'pos',
			...employeeOf({ operator: by ?? posPayment.operator })
		});
	}
}

/** Attaches, or corrects, the till's reference after the payment, keeping the previous one. */
export async function setExternalRef(
	id: ObjectId,
	ref: string,
	by?: string,
	employee?: AccountingLog['employee']
): Promise<void> {
	const posPayment = await collections.posPayments.findOne({ _id: id });
	const to = ref.trim();
	if (!posPayment || !to || posPayment.externalRef === to) {
		return;
	}
	const now = new Date();
	await collections.posPayments.updateOne(
		{ _id: id },
		{
			$set: { externalRef: to, updatedAt: now },
			$unset: { noExternalRef: 1 },
			$push: {
				externalRefHistory: { from: posPayment.externalRef ?? null, to, at: now, ...(by && { by }) }
			}
		}
	);
	await logAccountingEvent({
		eventType: 'posPaymentUpdate',
		before: { externalRef: posPayment.externalRef ?? null },
		after: { externalRef: to },
		objectId: id.toString(),
		objectType: 'posPayment',
		origin: 'pos',
		...(employee && { employee })
	});
}

/** The public address of a payment's receipt, the one its QR code gives the customer. */
export function posReceiptUrl(posPayment: Pick<PosPayment, 'receiptToken'>): string {
	return `${ORIGIN.replace(/\/+$/, '')}/pos-receipt/${posPayment.receiptToken}`;
}

function receiptAmount(posPayment: PosPayment): string {
	const total = posPayment.amount.amount + posPayment.tip.amount;
	return `${total.toLocaleString('en', {
		maximumFractionDigits: FRACTION_DIGITS_PER_CURRENCY[posPayment.amount.currency]
	})} ${posPayment.amount.currency}`;
}

/** Sends the receipt link by e-mail, with the shop's e-mail settings and templates. */
export async function sendPosReceiptByEmail(posPayment: PosPayment, email: string): Promise<void> {
	await queueEmail(email, 'pos.receipt', {
		number: String(posPayment.number),
		amount: receiptAmount(posPayment),
		receiptLink: posReceiptUrl(posPayment)
	});
}

/** Sends the receipt link as a Nostr direct message, the way be-BOP sends its other messages. */
export async function sendPosReceiptByNostr(posPayment: PosPayment, npub: string): Promise<void> {
	const now = new Date();
	await collections.nostrNotifications.insertOne({
		_id: new ObjectId(),
		createdAt: now,
		updatedAt: now,
		kind: Kind.EncryptedDirectMessage,
		dest: npub,
		content: `${runtimeConfig.brandName}: receipt of your payment of ${receiptAmount(
			posPayment
		)} (#${posPayment.number}): ${posReceiptUrl(posPayment)}`
	});
}
