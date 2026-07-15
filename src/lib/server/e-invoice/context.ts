import type { CountryAlpha2 } from '$lib/types/Country';
import { isFiatCurrency, SATOSHIS_PER_BTC, type Currency } from '$lib/types/Currency';
import type { EInvoiceParty } from '$lib/types/EInvoice';
import {
	orderIndividualItemPrice,
	type Order,
	type OrderPayment,
	type Price
} from '$lib/types/Order';
import type { SellerIdentity } from '$lib/types/SellerIdentity';
import type { PaymentMethod } from '$lib/server/payment-methods';
import { fixCurrencyRounding } from '$lib/utils/fixCurrencyRounding';
import type { LanguageKey } from '$lib/translations';

type CurrencyRole = 'main' | 'priceReference' | 'secondary' | 'accounting';

export interface InvoiceLine {
	name: string;
	quantity: number;
	/** Unit price excl. VAT, after per-item discount, in the invoice currency */
	unitPrice: number;
	/** Line net amount excl. VAT (unitPrice × quantity, rounded) */
	netAmount: number;
	vatRate: number;
}

export interface PaidWith {
	method: PaymentMethod;
	/** For 'point-of-sale' payments, e.g. "cash" or "check" */
	posSubtype?: string;
	/** For method 'custom', the snapshotted label */
	methodLabel?: string;
	paidAt: Date;
	/** Amount in the actual payment currency (e.g. 123456 SAT) */
	amount: Price;
	/** Same amount normalized for display (SAT → BTC) */
	display: { amount: number; currency: Currency };
	/** Value of the payment in the invoice currency at payment time */
	fiatEquivalent: { amount: number; currency: Currency };
	/** Rate at payment time ("1 BTC = 64998.55 EUR"); omitted when same currency */
	rate?: { base: Currency; quote: Currency; amount: number };
}

export interface VatBreakdownEntry {
	rate: number;
	country: CountryAlpha2;
	/** VAT amount for this rate, in the invoice currency */
	amount: number;
	/** Taxable base (BT-116) for this rate, in the invoice currency */
	base: number;
	/** EN16931 VAT category: S(tandard), Z(ero-rated), E(xempt) */
	category: 'S' | 'Z' | 'E';
	/** Exemption reason (BT-120) when category is E */
	exemptionReason?: string;
}

/**
 * Protocol-agnostic invoice data (EN16931 semantic model), computed once from
 * the order/payment snapshots and consumed by both the CII serializer and the
 * PDF layout so the two can never drift.
 */
export interface InvoiceContext {
	invoiceNumber: number;
	/** BT-2 */
	issueDate: Date;
	orderNumber: number;
	orderCreatedAt: Date;
	locale: LanguageKey;
	/** BT-5, always fiat */
	currency: Currency;
	seller: EInvoiceParty;
	buyer: EInvoiceParty;
	lines: InvoiceLine[];
	/** Document-level charge (BG-21): delivery fees, excl. VAT */
	shipping?: { amount: number; vatRate: number };
	/**
	 * Document-level allowance (BG-20): order discount + rounding drift between
	 * line sums and the snapshotted totals, so BR-CO-13 stays exact. A negative
	 * drift is folded into an extra charge instead.
	 */
	allowance: number;
	extraCharge: number;
	vatBreakdown: VatBreakdownEntry[];
	totals: {
		/** BT-106: sum of line net amounts */
		lineNet: number;
		/** BT-109 = lineNet - allowance + charges */
		exclVat: number;
		/** BT-110 */
		vat: number;
		/** BT-112 */
		inclVat: number;
		/** BT-113: previous payments + this payment */
		prepaid: number;
		/** BT-115 */
		due: number;
	};
	paidWith: PaidWith;
}

/** Round to the invoice currency's display precision (2 decimals for EUR). */
function round(amount: number, currency: Currency): number {
	return fixCurrencyRounding(amount, currency);
}

/**
 * First fiat currency role, preferring the accounting snapshot. Throws when the
 * shop only has crypto roles configured — the settings page warns about this,
 * and the error surfaces as the e-invoice's generation error.
 */
export function pickInvoiceCurrencyRole(order: Order): CurrencyRole {
	const roles: CurrencyRole[] = ['accounting', 'secondary', 'main'];
	for (const role of roles) {
		const entry = order.currencySnapshot[role];
		if (entry && isFiatCurrency(entry.totalPrice.currency)) {
			return role;
		}
	}
	throw new Error(
		'No fiat currency snapshot on the order: configure a fiat accounting/secondary/main currency for e-invoicing'
	);
}

function partyFromSeller(seller: SellerIdentity): EInvoiceParty {
	return {
		name: seller.businessName,
		isCompany: true,
		...(seller.vatNumber && { vatNumber: seller.vatNumber }),
		...(seller.legal?.siret && {
			siret: seller.legal.siret,
			siren: seller.legal.siret.slice(0, 9)
		}),
		...(seller.legal?.legalForm && { legalForm: seller.legal.legalForm }),
		address: {
			street: seller.address.street,
			zip: seller.address.zip,
			city: seller.address.city,
			country: seller.address.country,
			...(seller.address.state && { state: seller.address.state })
		},
		email: seller.contact.email,
		...(seller.contact.phone && { phone: seller.contact.phone })
	};
}

function partyFromOrder(order: Order): EInvoiceParty {
	const address = order.billingAddress ?? order.shippingAddress;
	if (address) {
		const name = address.isCompany
			? address.companyName || `${address.firstName} ${address.lastName}`.trim()
			: `${address.firstName} ${address.lastName}`.trim();
		return {
			name: name || order.user.email || 'Customer',
			...(address.isCompany && { isCompany: true }),
			...(address.vatNumber && { vatNumber: address.vatNumber }),
			...(address.siren && { siren: address.siren }),
			address: {
				street: address.address,
				zip: address.zip,
				city: address.city,
				country: address.country,
				...(address.state && { state: address.state })
			},
			...(order.user.email && { email: order.user.email }),
			...(address.phone && { phone: address.phone })
		};
	}
	// B2C order without any address (e.g. PoS): the buyer name (BT-44) is still
	// mandatory, fall back to the contact email.
	return {
		name: order.user.email ?? order.notifications.paymentStatus.email ?? 'Customer',
		...(order.user.email && { email: order.user.email })
	};
}

/**
 * Payment methods without a currency-specific processor: their price is
 * stored in the shop's mainCurrency purely as a bookkeeping conversion (see
 * paymentPrice() in orders.ts), not as the real currency that changed hands —
 * e.g. a 'custom' payment labeled "Ethereum" still has price.currency ===
 * mainCurrency (often BTC), which is not what the buyer actually paid with.
 */
const UNVERIFIED_SETTLEMENT_CURRENCY_METHODS: PaymentMethod[] = [
	'point-of-sale',
	'free',
	'bank-transfer',
	'custom'
];

function buildPaidWith(
	payment: OrderPayment,
	role: CurrencyRole,
	invoiceCurrency: Currency
): PaidWith {
	const amount = payment.received ?? payment.price;
	const fiatSnapshot = payment.currencySnapshot[role];
	if (!fiatSnapshot) {
		throw new Error(`Payment is missing its ${role} currency snapshot`);
	}
	const fiat = fiatSnapshot.received ?? fiatSnapshot.price;

	// SAT amounts make for absurd per-unit rates ("1 SAT = 0.00065 EUR"), show
	// them as BTC instead.
	const display =
		amount.currency === 'SAT'
			? { amount: amount.amount / SATOSHIS_PER_BTC, currency: 'BTC' as Currency }
			: { amount: amount.amount, currency: amount.currency };

	const settlementCurrencyVerified = !UNVERIFIED_SETTLEMENT_CURRENCY_METHODS.includes(
		payment.method
	);

	return {
		method: payment.method,
		...(payment.posSubtype && { posSubtype: payment.posSubtype }),
		...(payment.customPaymentMethod && { methodLabel: payment.customPaymentMethod.label }),
		paidAt: payment.paidAt ?? payment.invoice?.createdAt ?? new Date(),
		amount,
		display,
		fiatEquivalent: { amount: fiat.amount, currency: fiat.currency },
		...(settlementCurrencyVerified &&
			display.currency !== invoiceCurrency &&
			display.amount > 0 && {
				rate: {
					base: display.currency,
					quote: invoiceCurrency,
					amount: fiat.amount / display.amount
				}
			})
	};
}

/**
 * Map an order + paid payment to the EN16931 semantic model. Pure (no DB): the
 * seller identity is passed in already merged (order snapshot + runtimeConfig
 * legal fields) by the caller.
 *
 * Mirrors the legal receipt's arithmetic (receipt/+page.svelte): snapshot VAT
 * amounts are pre-order-discount and get scaled by the discount percentage;
 * totals come from the order snapshot, never recomputed from rates.
 */
export function buildInvoiceContext(params: {
	order: Order;
	payment: OrderPayment;
	seller: SellerIdentity;
}): InvoiceContext {
	const { order, payment, seller } = params;

	if (!payment.invoice?.number) {
		throw new Error('Payment has no invoice number');
	}

	const role = pickInvoiceCurrencyRole(order);
	const orderSnapshot = order.currencySnapshot[role];
	const paymentSnapshot = payment.currencySnapshot[role];
	if (!orderSnapshot || !paymentSnapshot) {
		throw new Error(`Order or payment is missing its ${role} currency snapshot`);
	}
	const currency = orderSnapshot.totalPrice.currency;

	// Lines (same math as the receipt table)
	const lines: InvoiceLine[] = order.items.map((item) => {
		const unitPrice = orderIndividualItemPrice(item, role);
		const quantity = Math.max(item.quantity - (item.freeQuantity ?? 0), 0);
		const variationSuffix = item.chosenVariations
			? ' - ' +
			  Object.entries(item.chosenVariations)
					.map(([key, value]) => item.product.variationLabels?.values[key][value])
					.join(' - ')
			: '';
		return {
			name: item.product.name + variationSuffix,
			quantity,
			unitPrice,
			netAmount: round(unitPrice * quantity, currency),
			vatRate: item.vatRate ?? 0
		};
	});
	const lineNet = round(
		lines.reduce((total, line) => total + line.netAmount, 0),
		currency
	);

	// Totals from the snapshot (receipt math: VAT amounts are pre-discount)
	const inclVat = orderSnapshot.totalPrice.amount;
	const discountPercentage = orderSnapshot.discount?.amount
		? orderSnapshot.discount.amount / (inclVat + orderSnapshot.discount.amount)
		: 0;
	const vatAmounts = (orderSnapshot.vat ?? []).map((vat) =>
		round(vat.amount * (1 - discountPercentage), currency)
	);
	const vat = round(
		vatAmounts.reduce((total, amount) => total + amount, 0),
		currency
	);
	const exclVat = round(inclVat - vat, currency);

	// VAT breakdown with derived taxable bases (BT-116) so per-category checks
	// hold by construction; the residual goes to the 0-rate row (or the largest
	// base) so Σ bases === exclVat exactly.
	const vatBreakdown: VatBreakdownEntry[] = (order.vat ?? []).map(({ rate, country }, i) => ({
		rate,
		country,
		amount: vatAmounts[i] ?? 0,
		base: rate > 0 ? round((vatAmounts[i] ?? 0) / (rate / 100), currency) : 0,
		category: order.vatFree ? ('E' as const) : rate > 0 ? ('S' as const) : ('Z' as const),
		...(order.vatFree && { exemptionReason: order.vatFree.reason })
	}));
	if (!vatBreakdown.length) {
		vatBreakdown.push({
			rate: 0,
			country: seller.address.country,
			amount: 0,
			base: exclVat,
			category: order.vatFree ? 'E' : 'Z',
			...(order.vatFree && { exemptionReason: order.vatFree.reason })
		});
	} else {
		const baseSum = round(
			vatBreakdown.reduce((total, entry) => total + entry.base, 0),
			currency
		);
		const residual = round(exclVat - baseSum, currency);
		if (residual !== 0) {
			const target =
				vatBreakdown.find((entry) => entry.rate === 0) ??
				vatBreakdown.reduce((a, b) => (b.base > a.base ? b : a));
			target.base = round(target.base + residual, currency);
		}
	}

	// Shipping is a document-level charge (BG-21); snapshot amount is excl. VAT
	const shippingAmount = orderSnapshot.shippingPrice?.amount ?? 0;
	const shipping =
		shippingAmount > 0
			? { amount: shippingAmount, vatRate: vatBreakdown[0]?.rate ?? 0 }
			: undefined;

	// Force BR-CO-13 exact: lineNet - allowance + charges === exclVat. The
	// allowance absorbs the order discount and any rounding drift; a negative
	// value flips into an extra charge.
	const drift = round(lineNet + shippingAmount - exclVat, currency);
	const allowance = drift > 0 ? drift : 0;
	const extraCharge = drift < 0 ? -drift : 0;

	const prepaid = round(
		(paymentSnapshot.previouslyPaid?.amount ?? 0) + paymentSnapshot.price.amount,
		currency
	);
	const due = round(paymentSnapshot.remainingToPay?.amount ?? inclVat - prepaid, currency);

	return {
		invoiceNumber: payment.invoice.number,
		issueDate: payment.invoice.createdAt ?? payment.paidAt ?? new Date(),
		orderNumber: order.number,
		orderCreatedAt: order.createdAt,
		locale: order.locale,
		currency,
		seller: partyFromSeller(seller),
		buyer: partyFromOrder(order),
		lines,
		shipping,
		allowance,
		extraCharge,
		vatBreakdown,
		totals: { lineNet, exclVat, vat, inclVat, prepaid, due },
		paidWith: buildPaidWith(payment, role, currency)
	};
}
