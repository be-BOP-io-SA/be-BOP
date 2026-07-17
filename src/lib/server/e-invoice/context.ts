import type { CountryAlpha2 } from '$lib/types/Country';
import { isFiatCurrency, SATOSHIS_PER_BTC, type Currency } from '$lib/types/Currency';
import type { EInvoiceCountry, EInvoiceParty } from '$lib/types/EInvoice';
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

/** Whether the order contains physical goods, services, or both — protocol-agnostic
 * fact derived from `Product.shipping` ("has a physical component that will be
 * shipped"). Country-specific serializers (e.g. cii.ts for France) turn this
 * into their own coded values. */
export type OperationNature = 'goods' | 'services' | 'mixed';

/** Seller/buyer country relationship, for cross-border VAT treatment. */
export type TransactionCategory = 'domestic' | 'intraEU' | 'export';

const EU_COUNTRIES: CountryAlpha2[] = [
	'AT',
	'BE',
	'BG',
	'HR',
	'CY',
	'CZ',
	'DK',
	'EE',
	'FI',
	'FR',
	'DE',
	'GR',
	'HU',
	'IE',
	'IT',
	'LV',
	'LT',
	'LU',
	'MT',
	'NL',
	'PL',
	'PT',
	'RO',
	'SK',
	'SI',
	'ES',
	'SE'
];

export function operationNature(order: Order): OperationNature {
	const hasGoods = order.items.some((item) => item.product.shipping);
	const hasServices = order.items.some((item) => !item.product.shipping);
	return hasGoods && hasServices ? 'mixed' : hasGoods ? 'goods' : 'services';
}

function transactionCategory(
	sellerCountry: CountryAlpha2,
	buyerCountry: CountryAlpha2 | undefined
): TransactionCategory {
	if (!buyerCountry || buyerCountry === sellerCountry) {
		return 'domestic';
	}
	return EU_COUNTRIES.includes(buyerCountry) ? 'intraEU' : 'export';
}

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
	country: EInvoiceCountry;
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
	operationNature: OperationNature;
	transactionCategory: TransactionCategory;
	lines: InvoiceLine[];
	/** Document-level charge (BG-21): delivery fees, excl. VAT */
	shipping?: { amount: number; vatRate: number };
	/** Document-level allowance (BG-20): the order's real discount, if any (>= 0) */
	discount: number;
	/**
	 * Pure floating-point drift between the line-level rounding (unitPrice ×
	 * quantity → 2dp) and the order-level snapshot rounding (totalPrice - vat,
	 * each rounded independently) — NEVER a real discount. Forces BR-CO-13
	 * exact (lineNet - discount - rounding + shipping = exclVat). Positive
	 * shows as an extra allowance ("Rounding"), negative as an extra charge.
	 */
	rounding: number;
	vatBreakdown: VatBreakdownEntry[];
	totals: {
		/** BT-106: sum of line net amounts */
		lineNet: number;
		/** BT-109 = lineNet - discount - rounding + shipping */
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
		...(seller.bank?.iban && {
			bank: { iban: seller.bank.iban, ...(seller.bank.bic && { bic: seller.bank.bic }) }
		}),
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
	country: EInvoiceCountry;
}): InvoiceContext {
	const { order, payment, seller, country } = params;

	if (!payment.invoice?.number) {
		throw new Error('Payment has no invoice number');
	}

	const sellerParty = partyFromSeller(seller);
	if (country === 'FR' && !sellerParty.siren) {
		throw new Error(
			'Seller SIRET is required for French e-invoicing (BR-FR-10) — set it in Admin → Identity'
		);
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
	let lineNet = round(
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

	const hasRealDiscount = !!orderSnapshot.discount;
	let discount = 0;
	let rounding = 0;

	if (hasRealDiscount) {
		// The gap between the line-level sum and the order's snapshotted excl-VAT
		// total IS the excl-VAT discount amount here — order.discount is stored
		// incl-VAT (see receipt/+page.svelte's discountNoTax, computed the same
		// way), so it can't be subtracted from lineNet directly; deriving it via
		// this identity is how the rest of the app already does it.
		discount = round(lineNet + shippingAmount - exclVat, currency);
	} else {
		// No real discount: any gap between the line-level sum and the order
		// snapshot is pure floating-point drift (e.g. a precise base price like
		// 2.8279 rounds to 2.83 at line level, but the order's independently
		// rounded totalPrice - vat yields 2.82) — never a real discount, and not
		// worth a document-level "Rounding" line either. Fold it directly into
		// the largest line's net amount instead, so lineNet matches the excl-VAT
		// total exactly and the invoice needs no rounding adjustment at all —
		// same technique already used below for the VAT-base residual.
		const target = round(exclVat - shippingAmount, currency);
		const residual = round(target - lineNet, currency);
		if (residual !== 0 && lines.length) {
			const largest = lines.reduce((a, b) => (b.netAmount > a.netAmount ? b : a));
			largest.netAmount = round(largest.netAmount + residual, currency);
			lineNet = target;
		} else {
			// No line to absorb the residual into (e.g. a zero-item order) —
			// extremely rare; fall back to a document-level rounding note rather
			// than silently losing a cent.
			rounding = residual;
		}
	}

	const prepaid = round(
		(paymentSnapshot.previouslyPaid?.amount ?? 0) + paymentSnapshot.price.amount,
		currency
	);
	const due = round(paymentSnapshot.remainingToPay?.amount ?? inclVat - prepaid, currency);

	const buyerCountry = order.billingAddress?.country ?? order.shippingAddress?.country;

	const paidWith = buildPaidWith(payment, role, currency);
	// BR-61: a credit-transfer payment means (BT-81 code 30) requires the
	// payee's account identifier (BT-84) to be present.
	if (paidWith.method === 'bank-transfer' && !sellerParty.bank?.iban) {
		throw new Error(
			'Seller IBAN is required for bank-transfer invoices (BR-61) — set it in Admin → Identity'
		);
	}

	return {
		country,
		invoiceNumber: payment.invoice.number,
		issueDate: payment.invoice.createdAt ?? payment.paidAt ?? new Date(),
		orderNumber: order.number,
		orderCreatedAt: order.createdAt,
		locale: order.locale,
		currency,
		seller: sellerParty,
		buyer: partyFromOrder(order),
		operationNature: operationNature(order),
		transactionCategory: transactionCategory(seller.address.country, buyerCountry),
		lines,
		shipping,
		discount,
		rounding,
		vatBreakdown,
		totals: { lineNet, exclVat, vat, inclVat, prepaid, due },
		paidWith
	};
}

/**
 * Split a mixed goods+services payment into two invoices — one covering only
 * goods lines, one only service lines. Required because French B2C
 * e-reporting (AFNOR Z12-012 Annex A) declares each transaction under a
 * single category (goods `TLB1` vs services `TPS1`); a mixed (billing mode
 * M1/M2/M8) invoice can't be classified for e-reporting and PDPs reject it,
 * even though the CII XML itself is fully EN16931/BR-FR conformant.
 *
 * Builds the normal, fully-reconciled `InvoiceContext` once (reusing every
 * validation and the snapshot-vs-lines reconciliation in buildInvoiceContext
 * unchanged), then partitions its already-correct totals across the two
 * categories. Every split step uses subtraction for the second category
 * (never a second independent rounding), so both documents individually
 * satisfy BR-CO-13 and the pair reconciles back to the combined totals
 * exactly, to the cent — money is partitioned, never created or lost.
 */
export function buildSplitInvoiceContexts(params: {
	order: Order;
	payment: OrderPayment;
	seller: SellerIdentity;
	country: EInvoiceCountry;
}): { goods: InvoiceContext; services: InvoiceContext } {
	const { order, payment } = params;

	if (!payment.servicesInvoice?.number) {
		throw new Error('Payment is missing its services invoice number');
	}

	const combined = buildInvoiceContext(params);
	const currency = combined.currency;

	const isGoodsLine = order.items.map((item) => !!item.product.shipping);
	const goodsLines = combined.lines.filter((_, i) => isGoodsLine[i]);
	const servicesLines = combined.lines.filter((_, i) => !isGoodsLine[i]);
	let goodsLineNet = round(
		goodsLines.reduce((total, line) => total + line.netAmount, 0),
		currency
	);
	let servicesLineNet = round(combined.totals.lineNet - goodsLineNet, currency);

	const shippingAmount = combined.shipping?.amount ?? 0;
	const shippingVatRate = combined.shipping?.vatRate;

	const baseAtRate = (lines: InvoiceLine[], rate: number) =>
		round(
			lines
				.filter((line) => line.vatRate === rate)
				.reduce((total, line) => total + line.netAmount, 0),
			currency
		);

	// Split each VAT-breakdown row by that rate's goods/services line-base ratio;
	// shipping (goods only) is added to goods' share before splitting. Subtraction
	// for the services half at every step keeps the pair summing exactly to the row.
	const goodsVatBreakdown: VatBreakdownEntry[] = [];
	const servicesVatBreakdown: VatBreakdownEntry[] = [];
	for (const row of combined.vatBreakdown) {
		const isShippingRow = shippingAmount > 0 && row.rate === shippingVatRate;
		const nonShippingBase = round(row.base - (isShippingRow ? shippingAmount : 0), currency);
		const goodsLineBase = baseAtRate(goodsLines, row.rate);
		const servicesLineBase = baseAtRate(servicesLines, row.rate);
		const lineBaseTotal = round(goodsLineBase + servicesLineBase, currency);
		const goodsShare = lineBaseTotal > 0 ? goodsLineBase / lineBaseTotal : 0.5;

		const goodsNonShippingBase = round(nonShippingBase * goodsShare, currency);
		const goodsBase = round(goodsNonShippingBase + (isShippingRow ? shippingAmount : 0), currency);
		const servicesBase = round(row.base - goodsBase, currency);
		const goodsAmount = round(goodsBase * (row.rate / 100), currency);
		const servicesAmount = round(row.amount - goodsAmount, currency);

		goodsVatBreakdown.push({ ...row, base: goodsBase, amount: goodsAmount });
		servicesVatBreakdown.push({ ...row, base: servicesBase, amount: servicesAmount });
	}
	// Never emit a same-rate row that's actually empty for this category (e.g. a
	// rate that only appeared on the other category's lines).
	const dropEmptyRows = (rows: VatBreakdownEntry[]) =>
		rows.filter((row) => row.base !== 0 || row.amount !== 0);
	const goodsVatRows = dropEmptyRows(goodsVatBreakdown);
	const servicesVatRows = dropEmptyRows(servicesVatBreakdown);

	const goodsExclVat = round(
		goodsVatRows.reduce((total, row) => total + row.base, 0),
		currency
	);
	const servicesExclVat = round(combined.totals.exclVat - goodsExclVat, currency);
	const goodsVat = round(
		goodsVatRows.reduce((total, row) => total + row.amount, 0),
		currency
	);
	const servicesVat = round(combined.totals.vat - goodsVat, currency);
	const goodsInclVat = round(goodsExclVat + goodsVat, currency);
	const servicesInclVat = round(combined.totals.inclVat - goodsInclVat, currency);

	// Discount (BG-20, display-only) via the same identity buildInvoiceContext uses,
	// solved per category — algebraically guaranteed to sum back to combined.discount
	// since lineNet and exclVat both partition exactly. When there's no real discount,
	// fold any drift into each category's largest line instead (never label rounding
	// drift as a Discount, and never expose a Rounding line — same philosophy as
	// buildInvoiceContext's own no-discount branch).
	let goodsDiscount = 0;
	let servicesDiscount = 0;
	if (combined.discount > 0) {
		goodsDiscount = round(goodsLineNet + shippingAmount - goodsExclVat, currency);
		servicesDiscount = round(servicesLineNet - servicesExclVat, currency);
	} else {
		const goodsTarget = round(goodsExclVat - shippingAmount, currency);
		const goodsResidual = round(goodsTarget - goodsLineNet, currency);
		if (goodsResidual !== 0 && goodsLines.length) {
			const largest = goodsLines.reduce((a, b) => (b.netAmount > a.netAmount ? b : a));
			largest.netAmount = round(largest.netAmount + goodsResidual, currency);
			goodsLineNet = goodsTarget;
		}
		const servicesResidual = round(servicesExclVat - servicesLineNet, currency);
		if (servicesResidual !== 0 && servicesLines.length) {
			const largest = servicesLines.reduce((a, b) => (b.netAmount > a.netAmount ? b : a));
			largest.netAmount = round(largest.netAmount + servicesResidual, currency);
			servicesLineNet = servicesExclVat;
		}
	}

	const inclVatShare = combined.totals.inclVat > 0 ? goodsInclVat / combined.totals.inclVat : 0.5;
	const goodsPrepaid = round(combined.totals.prepaid * inclVatShare, currency);
	const servicesPrepaid = round(combined.totals.prepaid - goodsPrepaid, currency);
	const goodsDue = round(combined.totals.due * inclVatShare, currency);
	const servicesDue = round(combined.totals.due - goodsDue, currency);

	const goods: InvoiceContext = {
		...combined,
		operationNature: 'goods',
		lines: goodsLines,
		discount: goodsDiscount,
		rounding: 0,
		vatBreakdown: goodsVatRows,
		totals: {
			lineNet: goodsLineNet,
			exclVat: goodsExclVat,
			vat: goodsVat,
			inclVat: goodsInclVat,
			prepaid: goodsPrepaid,
			due: goodsDue
		}
	};

	const services: InvoiceContext = {
		...combined,
		operationNature: 'services',
		invoiceNumber: payment.servicesInvoice.number,
		issueDate: payment.servicesInvoice.createdAt ?? combined.issueDate,
		lines: servicesLines,
		shipping: undefined,
		discount: servicesDiscount,
		rounding: 0,
		vatBreakdown: servicesVatRows,
		totals: {
			lineNet: servicesLineNet,
			exclVat: servicesExclVat,
			vat: servicesVat,
			inclVat: servicesInclVat,
			prepaid: servicesPrepaid,
			due: servicesDue
		}
	};

	return { goods, services };
}
