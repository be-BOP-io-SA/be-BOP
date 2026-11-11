import { collections } from '$lib/server/database';
import {
	addOrderPayment,
	createOrder,
	onOrderPayment,
	onOrderPaymentFailed
} from '$lib/server/orders';
import { runtimeConfig } from '$lib/server/runtime-config';
import { toCurrency } from '$lib/utils/toCurrency';
import {
	API_V1_DUPLICATE_EXTERNAL_ORDER_ID,
	type AuthenticatedApiKey,
	type ApiV1OrderResult,
	type ApiV1Warning
} from '$lib/types/ApiV1';
import type { Order } from '$lib/types/Order';
import {
	normalizeOrderPayments,
	type OrderPaymentWrite,
	type OrderWriteCommand
} from '$lib/server/api/v1/schemas/orders-write';
import { checkProductVariationsIntegrity, productPriceWithVariations } from '$lib/types/Product';
import { amountToMinor, minorToPrice } from './money';
import { mapCustomFields } from './mapCustomFields';
import { mapDomainError } from './mapErrors';
import { ensureApiOrderLabel, ensureCatalogIntegrityLabel } from './ensureCatalogIntegrityLabel';
import { resolveProducts } from './resolveProducts';
import { resolveOrderLabels } from './addLabel';
import { API_ORDER_SELLER_ALIAS } from './seller';

export type WriteOneParams = {
	apiKey: AuthenticatedApiKey;
	order: OrderWriteCommand;
	clientIp?: string;
};

type PosSubtypeResolution = {
	posSubtype?: string;
	warning?: ApiV1Warning;
};

export async function resolvePosSubtype(
	posLabel: string | undefined
): Promise<PosSubtypeResolution> {
	if (!posLabel) {
		return {};
	}
	const subtype = await collections.posPaymentSubtypes.findOne({
		slug: posLabel,
		disabled: { $ne: true }
	});
	if (subtype) {
		return { posSubtype: subtype.slug };
	}
	return {
		warning: {
			code: 'POS_LABEL_UNKNOWN',
			message: `Unknown posLabel: ${posLabel}`,
			details: { posLabel }
		}
	};
}

async function applyMatchedPaymentStatus(
	order: Order,
	existingPayment: Order['payments'][number],
	payment: OrderPaymentWrite
): Promise<Order> {
	// Admin confirm/cancel both require payment.status === 'pending'.
	if (existingPayment.status !== 'pending') {
		return order;
	}
	if (payment.status === 'paid') {
		return onOrderPayment(order, existingPayment, existingPayment.price);
	}
	if (payment.status === 'pending') {
		return order;
	}
	// Terminal: canceled | failed | expired — same helpers as cancelPayment / locks.
	// A till reports an outcome, it does not open a retry: an order whose only payment failed is
	// closed rather than left waiting for a payment that will never come.
	return onOrderPaymentFailed(order, existingPayment, payment.status, { terminal: true });
}

/**
 * Apply the status each payload payment carries to the payment row written for it.
 *
 * Rows are written in payload order — by createOrder for a single payment, one by one for several —
 * so the payload index is the row index. A zero-total order has no row unless it was paid ('free').
 */
async function settleCreatedPayments(order: Order, payments: OrderPaymentWrite[]): Promise<Order> {
	let current = order;
	for (let i = 0; i < payments.length; i++) {
		const row = current.payments[i];
		if (!row) {
			continue;
		}
		current = await applyMatchedPaymentStatus(current, row, payments[i]);
		const fresh = await collections.orders.findOne({ _id: current._id });
		if (fresh) {
			current = fresh;
		}
	}
	return current;
}

function duplicateRefusal(cmd: OrderWriteCommand, orderId?: string): ApiV1OrderResult {
	return {
		externalOrderId: cmd.externalOrderId,
		status: 'failed',
		error: {
			code: API_V1_DUPLICATE_EXTERNAL_ORDER_ID,
			message:
				`externalOrderId ${cmd.externalOrderId} was already received from this API key. ` +
				'Each call creates one order: send a new externalOrderId, or tick "Accept several ' +
				'orders with the same external id" on the key in Admin -> API Keys.',
			...(orderId && { details: { orderId } })
		}
	};
}

async function ensureMultiPayments(
	order: Order,
	payments: OrderPaymentWrite[],
	posSubtypes: (string | undefined)[]
): Promise<Order> {
	let current = order;
	for (let i = 0; i < payments.length; i++) {
		if (current.payments[i]) {
			continue;
		}
		const payment = payments[i];
		await addOrderPayment(
			current,
			'point-of-sale',
			minorToPrice(payment.amountMinor, payment.currency),
			{
				expiresAt: null,
				...(posSubtypes[i] && { posSubtype: posSubtypes[i] }),
				...(payment.externalPaymentId && { externalPaymentId: payment.externalPaymentId })
			}
		);
		const fresh = await collections.orders.findOne({ _id: current._id });
		if (!fresh) {
			throw new Error('Order not found after addOrderPayment');
		}
		current = fresh;
	}
	return current;
}

/**
 * Persist a single API order command: one call, one order.
 * Orchestrates the external id check → resolveProducts → createOrder → payment settle.
 * No HTTP / transport concerns here.
 */
export async function writeOne(params: WriteOneParams): Promise<ApiV1OrderResult> {
	const { apiKey, order: cmd } = params;
	const payments = normalizeOrderPayments(cmd);

	if (cmd.currency !== runtimeConfig.mainCurrency) {
		return {
			externalOrderId: cmd.externalOrderId,
			status: 'failed',
			error: {
				code: 'CURRENCY_UNSUPPORTED',
				message: `Order currency ${cmd.currency} does not match shop main currency ${runtimeConfig.mainCurrency}`,
				details: {
					orderCurrency: cmd.currency,
					mainCurrency: runtimeConfig.mainCurrency
				}
			}
		};
	}

	// One call, one order. By default an external id this key already sent is refused, and the
	// order it names is left as it is: payments are never reconciled onto an existing order.
	if (!apiKey.acceptDuplicateExternalOrderIds) {
		const existing = await collections.orders.findOne(
			{ externalSourceApiKeyId: apiKey._id, externalOrderId: cmd.externalOrderId },
			{ projection: { _id: 1 } }
		);
		if (existing) {
			return duplicateRefusal(cmd, existing._id);
		}
	}

	return writeNewOrder(params, payments);
}

async function writeNewOrder(
	params: WriteOneParams,
	payments: OrderPaymentWrite[]
): Promise<ApiV1OrderResult> {
	const { apiKey, order: cmd, clientIp } = params;
	const warnings: ApiV1Warning[] = [];
	const trustExternalPricing = runtimeConfig.apiV1.trustExternalPricing;

	// A line that takes money off the order only makes sense when the caller sets the prices. With
	// be-BOP pricing its own catalogue, there is no product behind it and no total it could belong
	// to, so it is refused rather than quietly charged as zero.
	if (!trustExternalPricing) {
		const negative = cmd.items.find((item) => (item.customPrice?.amountMinor ?? 0) < 0);
		if (negative) {
			return {
				externalOrderId: cmd.externalOrderId,
				status: 'failed',
				error: {
					code: 'VALIDATION_ERROR',
					message:
						`Negative price on ${negative.productId}. Enable "Make the third-party system the ` +
						`prioritary source of truth" in Admin -> API Keys to accept the prices this API sends.`,
					details: { productId: negative.productId }
				}
			};
		}
	}

	try {
		const { lines, warnings: productWarnings } = await resolveProducts(cmd.items, cmd.currency, {
			trustExternalPricing
		});
		warnings.push(...productWarnings);

		const posSubtypes: (string | undefined)[] = [];
		for (const payment of payments) {
			const { posSubtype, warning: posWarning } = await resolvePosSubtype(payment.posLabel);
			posSubtypes.push(posSubtype);
			if (posWarning) {
				warnings.push(posWarning);
			}
		}

		const customCheckoutFields = mapCustomFields(cmd.customFields);
		const missingProduct = lines.some((line) => line.missing);

		// createOrder → addOrderPayment rejects point-of-sale when the line total is 0.
		// Missing-product stubs may be priced at customPrice||0 (M5). Prefer 'free' for
		// zero-total paid so the domain paid pipeline runs (stock/webhooks/accounting).
		// Mirror what createOrder will actually charge: it overwrites customPrice with
		// productPriceWithVariations for variation products. Summing the base price here would
		// read a 0-base-price product with a paid variation as a zero total, flip paymentMethod
		// to 'free', and auto-settle an order nobody paid.
		const provisionalMajor = lines.reduce((sum, line) => {
			const product = line.product;
			// With the caller as the source of truth, a price it sent is the price, full stop —
			// including on a variation product, whose catalogue price would otherwise win below.
			if (trustExternalPricing && line.customPrice) {
				return sum + line.customPrice.amount * line.quantity;
			}
			const hasPricedVariations =
				!!product.variations?.length &&
				!product.payWhatYouWant &&
				checkProductVariationsIntegrity(product, line.chosenVariations);
			const unit = hasPricedVariations
				? productPriceWithVariations(product, line.chosenVariations)
				: line.customPrice?.amount ?? product.price.amount;
			return sum + unit * line.quantity;
		}, 0);
		const isZeroTotal = provisionalMajor <= 0;
		const multi = payments.length > 1 && !isZeroTotal;

		// Mono (or zero-total): createOrder owns the first payment row.
		// Multi: create bare order then addOrderPayment per payload row (admin-style splits).
		const paymentMethod = multi
			? null
			: isZeroTotal
			? payments[0]?.status === 'paid'
				? ('free' as const)
				: null
			: ('point-of-sale' as const);

		const requestedLabels = await resolveOrderLabels(cmd.labels);
		for (const missingLabel of requestedLabels.missing) {
			warnings.push({
				code: 'LABEL_MISSING',
				message: `Order label not found, order written without it: ${missingLabel}`,
				details: { labelId: missingLabel }
			});
		}

		// Every API sale is labelled as such, so the shop can pull them out of its order listing in
		// one filter — the seller alias says the same thing, but the listing cannot filter on it.
		const labelIds = [
			await ensureApiOrderLabel(),
			...(missingProduct ? [await ensureCatalogIntegrityLabel()] : []),
			...requestedLabels.found
		];
		const orderLabelIds = labelIds.length ? labelIds : undefined;

		const orderId = await createOrder(
			lines.map((line) => ({
				product: line.product,
				quantity: line.quantity,
				...(line.customPrice && { customPrice: line.customPrice }),
				...(line.chosenVariations && { chosenVariations: line.chosenVariations }),
				...(line.uniqueKey && { uniqueKey: line.uniqueKey })
			})),
			paymentMethod,
			{
				locale: runtimeConfig.defaultLanguage,
				user: {
					sessionId: `api-v1:${apiKey._id.toString()}`,
					userAlias: API_ORDER_SELLER_ALIAS,
					userHasPosOptions: true
				},
				shippingAddress: null,
				onLocation: true,
				userVatCountry: runtimeConfig.vatCountry,
				channel: 'api',
				// PoS already priced the ticket — dedicated api channel + skip shop auto-discounts.
				skipAutoDiscounts: true,
				externalOrderId: cmd.externalOrderId,
				externalSourceApiKeyId: apiKey._id,
				...(orderLabelIds && { orderLabelIds }),
				...(cmd.notifications === false && { skipNotifications: true }),
				...(cmd.createdAt && { createdAt: new Date(cmd.createdAt) }),
				...(clientIp && { clientIp }),
				...(cmd.notes && { note: cmd.notes }),
				...(customCheckoutFields.length && { customCheckoutFields }),
				...(!multi && posSubtypes[0] && { posSubtype: posSubtypes[0] }),
				...(!multi &&
					payments[0]?.externalPaymentId && {
						externalPaymentId: payments[0].externalPaymentId
					})
			}
		);

		let order = await collections.orders.findOne({ _id: orderId });
		if (!order) {
			throw new Error('Order not found after create');
		}

		// Order row exists: payment setup/settle failures must not report `failed` without orderId,
		// since a retry with the same external id would be refused. They come back as a warning.
		try {
			if (multi) {
				order = await ensureMultiPayments(order, payments, posSubtypes);
			}

			// Truth = line totals from createOrder; client payment amountMinor is advisory (M4).
			const orderTotalInPaymentCurrency = toCurrency(
				cmd.currency,
				order.currencySnapshot.main.totalPrice.amount,
				order.currencySnapshot.main.totalPrice.currency
			);
			const orderTotalMinor = amountToMinor(orderTotalInPaymentCurrency, cmd.currency);
			const clientTotalMinor = payments.reduce((sum, p) => sum + p.amountMinor, 0);
			if (clientTotalMinor !== orderTotalMinor) {
				warnings.push({
					code: 'AMOUNT_MISMATCH',
					message:
						payments.length > 1
							? 'sum(payments[].amountMinor) differs from order total computed from lines'
							: 'payment.amountMinor differs from order total computed from lines',
					details: {
						paymentAmountMinor: clientTotalMinor,
						orderTotalAmountMinor: orderTotalMinor,
						currency: cmd.currency,
						paymentCount: payments.length
					}
				});
			}

			await settleCreatedPayments(order, payments);
		} catch (err) {
			const mapped = mapDomainError(err);
			console.error('[api/v1] payment sync on create failed', {
				orderId,
				externalOrderId: cmd.externalOrderId,
				code: mapped.code,
				message: mapped.message
			});
			warnings.push({
				code: 'PAYMENT_SYNC_FAILED',
				message: mapped.message,
				details: {
					domainCode: mapped.code,
					...(mapped.details ?? {})
				}
			});
		}

		return {
			externalOrderId: cmd.externalOrderId,
			status: 'created',
			orderId,
			...(warnings.length && { warnings })
		};
	} catch (err) {
		return {
			externalOrderId: cmd.externalOrderId,
			status: 'failed',
			error: mapDomainError(err),
			...(warnings.length && { warnings })
		};
	}
}
