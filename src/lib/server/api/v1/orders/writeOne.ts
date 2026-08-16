import { collections } from '$lib/server/database';
import {
	addOrderPayment,
	createOrder,
	onOrderPayment,
	onOrderPaymentFailed
} from '$lib/server/orders';
import { orderAmountWithNoPaymentsCreated } from '$lib/types/Order';
import { matchPayloadPayment, shouldAddUnmatchedPayment } from './matchPayments';
import { runtimeConfig } from '$lib/server/runtime-config';
import { isUniqueConstraintError } from '$lib/server/utils/isUniqueConstraintError';
import { toCurrency } from '$lib/utils/toCurrency';
import type { AuthenticatedApiKey, ApiV1OrderResult, ApiV1Warning } from '$lib/types/ApiV1';
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
import { ensureCatalogIntegrityLabel } from './ensureCatalogIntegrityLabel';
import { resolveProducts } from './resolveProducts';

function isDuplicateKeyError(err: unknown): boolean {
	if (isUniqueConstraintError(err)) {
		return true;
	}
	if (
		typeof err === 'object' &&
		err &&
		'code' in err &&
		(err as { code: unknown }).code === 11000
	) {
		return true;
	}
	if (typeof err === 'object' && err && 'cause' in err) {
		return isDuplicateKeyError((err as { cause: unknown }).cause);
	}
	return false;
}

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
	return onOrderPaymentFailed(order, existingPayment, payment.status);
}

async function addAndSettleUnmatchedPayment(
	order: Order,
	payment: OrderPaymentWrite
): Promise<{ order: Order; addedIndex?: number }> {
	const { posSubtype } = await resolvePosSubtype(payment.posLabel);
	const beforeCount = order.payments.length;
	try {
		await addOrderPayment(
			order,
			'point-of-sale',
			minorToPrice(payment.amountMinor, payment.currency),
			{
				expiresAt: null,
				...(posSubtype && { posSubtype }),
				...(payment.externalPaymentId && { externalPaymentId: payment.externalPaymentId })
			}
		);
	} catch (err) {
		// Remaining / status guards rejected the add — ignore (D3: no hard fail on duplicate).
		const mapped = mapDomainError(err);
		console.error('[api/v1] addOrderPayment on duplicate failed', {
			orderId: order._id,
			externalPaymentId: payment.externalPaymentId,
			code: mapped.code,
			message: mapped.message
		});
		return { order };
	}
	const afterAdd = await collections.orders.findOne({ _id: order._id });
	if (!afterAdd) {
		throw new Error('Order not found after addOrderPayment on duplicate');
	}
	if (afterAdd.payments.length <= beforeCount) {
		return { order: afterAdd };
	}
	const addedIndex = afterAdd.payments.length - 1;
	const created = afterAdd.payments[addedIndex];
	if (!created) {
		return { order: afterAdd };
	}
	const settled = await applyMatchedPaymentStatus(afterAdd, created, payment);
	return { order: settled, addedIndex };
}

/**
 * Match strategy (duplicate settle / sync):
 * 1. externalPaymentId when present on both sides
 * 2. unused order payment by (amountMinor + currency + method)
 * 3. same index if still unused — only when payload has no externalPaymentId (legacy)
 * Never apply two payload payments to the same order payment.
 * Extra payload payment with a new externalPaymentId: addOrderPayment when order is
 * pending and remaining allows (admin-style); otherwise ignore (no item mutation).
 * Zero-total with no payment row: addOrderPayment('free') so onOrderPayment / webhooks run.
 */
async function syncExternalPaymentAtIndex(
	order: Order,
	payment: OrderPaymentWrite,
	index: number,
	usedOrderIndexes: Set<number>
): Promise<Order> {
	// Zero-total order created without a payment row (paymentMethod null).
	const orderTotalMain = order.currencySnapshot.main.totalPrice.amount;
	if (
		order.payments.length === 0 &&
		payment.status === 'paid' &&
		order.status !== 'paid' &&
		orderTotalMain <= 0
	) {
		await addOrderPayment(
			order,
			'free',
			{
				amount: 0,
				currency: order.currencySnapshot.main.totalPrice.currency
			},
			{
				expiresAt: null,
				...(payment.externalPaymentId && { externalPaymentId: payment.externalPaymentId })
			}
		);
		const updated = await collections.orders.findOne({ _id: order._id });
		if (!updated) {
			throw new Error('Order not found after zero-total free payment');
		}
		if (updated.payments[0]) {
			usedOrderIndexes.add(0);
		}
		return updated;
	}

	const match = matchPayloadPayment(order.payments, payment, index, usedOrderIndexes);
	if (match.kind === 'existing') {
		usedOrderIndexes.add(match.orderPaymentIndex);
		const existingPayment = order.payments[match.orderPaymentIndex];
		return applyMatchedPaymentStatus(order, existingPayment, payment);
	}

	const remaining = orderAmountWithNoPaymentsCreated(order);
	if (shouldAddUnmatchedPayment(order, payment, remaining)) {
		const { order: after, addedIndex } = await addAndSettleUnmatchedPayment(order, payment);
		if (addedIndex !== undefined) {
			usedOrderIndexes.add(addedIndex);
		}
		return after;
	}

	return order;
}

/**
 * Apply external payment intents via the same domain helpers/guards as admin order UI.
 * Supports one or many payments; matching prefers externalPaymentId (see matchPayments).
 */
export async function syncExternalPayments(
	order: Order,
	payments: OrderPaymentWrite[]
): Promise<Order> {
	let current = order;
	const usedOrderIndexes = new Set<number>();
	for (let i = 0; i < payments.length; i++) {
		current = await syncExternalPaymentAtIndex(current, payments[i], i, usedOrderIndexes);
		const fresh = await collections.orders.findOne({ _id: current._id });
		if (fresh) {
			current = fresh;
		}
	}
	return current;
}

/** @deprecated Prefer syncExternalPayments — kept for call-site clarity in older tests. */
export async function syncExternalPayment(
	order: Order,
	payment: OrderPaymentWrite
): Promise<Order> {
	return syncExternalPayments(order, [payment]);
}

async function settleExistingOrder(
	existing: Order,
	cmd: OrderWriteCommand
): Promise<ApiV1OrderResult> {
	const payments = normalizeOrderPayments(cmd);
	const warnings: ApiV1Warning[] = [];
	// Retry of a paid intent must complete payment if the prior write stopped mid-flight.
	// Domain errors stay per-command: keep duplicate (idempotency key hit) + warning (D1/D3).
	try {
		await syncExternalPayments(existing, payments);
	} catch (err) {
		const mapped = mapDomainError(err);
		console.error('[api/v1] payment sync on duplicate failed', {
			orderId: existing._id,
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
		status: 'duplicate',
		orderId: existing._id,
		...(warnings.length && { warnings })
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
 * Persist a single API order command.
 * Orchestrates resolveProducts → createOrder (atomic external ids) → payment sync.
 * No HTTP / transport concerns here.
 */
export async function writeOne(params: WriteOneParams): Promise<ApiV1OrderResult> {
	const { apiKey, order: cmd, clientIp } = params;
	const warnings: ApiV1Warning[] = [];
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

	const existing = await collections.orders.findOne({
		externalSourceApiKeyId: apiKey._id,
		externalOrderId: cmd.externalOrderId
	});
	if (existing) {
		return settleExistingOrder(existing, cmd);
	}

	try {
		const { lines, warnings: productWarnings } = await resolveProducts(cmd.items, cmd.currency);
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

		const orderLabelIds = missingProduct ? [await ensureCatalogIntegrityLabel()] : undefined;

		let orderId: string;
		try {
			orderId = await createOrder(
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
		} catch (err) {
			if (isDuplicateKeyError(err)) {
				// Concurrent insert won the sparse unique index — no orphan to delete.
				const winner = await collections.orders.findOne({
					externalSourceApiKeyId: apiKey._id,
					externalOrderId: cmd.externalOrderId
				});
				if (winner) {
					return settleExistingOrder(winner, cmd);
				}
			}
			throw err;
		}

		let order = await collections.orders.findOne({ _id: orderId });
		if (!order) {
			throw new Error('Order not found after create');
		}

		// Order row exists: payment setup/settle failures must not report `failed` without orderId
		// (retry would hit duplicate). Mirror settleExistingOrder → PAYMENT_SYNC_FAILED warning.
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

			await syncExternalPayments(order, payments);
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
