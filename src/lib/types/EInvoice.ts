import type { ObjectId, Binary } from 'mongodb';
import type { Timestamps } from './Timestamps';
import type { Currency } from './Currency';
import type { CountryAlpha2 } from './Country';
import type { Order, Price } from './Order';
import type { PaymentMethod } from '$lib/server/payment-methods';

/**
 * Countries with an implemented e-invoicing protocol. Only France (Factur-X:
 * EN16931 CII XML embedded in a PDF/A-3B) for now; the config country select
 * is derived from this list so new countries plug in here.
 */
export const E_INVOICE_COUNTRIES = ['FR'] as const;
export type EInvoiceCountry = (typeof E_INVOICE_COUNTRIES)[number];

export const E_INVOICE_FORMATS = ['factur-x'] as const;
export type EInvoiceFormat = (typeof E_INVOICE_FORMATS)[number];

export const E_INVOICE_GENERATION_STATUSES = ['pending', 'generated', 'failed'] as const;
export type EInvoiceGenerationStatus = (typeof E_INVOICE_GENERATION_STATUSES)[number];

export const E_INVOICE_TRANSMISSION_STATUSES = [
	'none',
	'queued',
	'submitted',
	'accepted',
	'rejected',
	'error'
] as const;
export type EInvoiceTransmissionStatus = (typeof E_INVOICE_TRANSMISSION_STATUSES)[number];

export interface EInvoiceLine {
	name: string;
	quantity: number;
	/** Unit price excl. VAT, after per-item discount, in the invoice currency */
	unitPrice: number;
	/** Line net amount excl. VAT (unitPrice × quantity, rounded) */
	netAmount: number;
	vatRate: number;
}

export interface EInvoiceParty {
	name: string;
	isCompany?: boolean;
	vatNumber?: string;
	/** Seller legal registration (EN16931 BT-30, schemeID 0002 for SIREN) */
	siren?: string;
	siret?: string;
	legalForm?: string;
	address?: {
		street: string;
		zip: string;
		city: string;
		country: CountryAlpha2;
		state?: string;
	};
	email?: string;
	phone?: string;
}

/**
 * One e-invoice per paid payment, aligned with `OrderPayment.invoice.number`.
 *
 * Inserted as a slim "pending" doc inside the payment transaction (see
 * createPendingEInvoice), then enriched by the e-invoice worker with the
 * normalized invoice data + artifacts so the admin pages and future
 * e-reporting read this collection without re-mapping orders.
 */
export interface EInvoice extends Timestamps {
	_id: ObjectId;

	orderId: Order['_id'];
	orderNumber: number;
	paymentId: string;
	/** BT-1, equals `payment.invoice.number` (gapless sequential) */
	invoiceNumber: number;

	country: EInvoiceCountry;
	format: EInvoiceFormat;

	// Written by the worker on successful generation (snapshot of the XML content)
	/** Invoice currency (BT-5), always fiat */
	currency?: Currency;
	/** BT-2, when the invoice was legally issued */
	issueDate?: Date;
	orderCreatedAt?: Date;
	seller?: EInvoiceParty;
	buyer?: EInvoiceParty;
	lines?: EInvoiceLine[];
	/** Document-level charge (BG-21): delivery fees, excl. VAT */
	shipping?: { amount: number; vatRate: number };
	/** Document-level allowance (BG-20): the order's real discount, if any (>= 0) */
	discount?: number;
	/** Pure rounding drift (never a real discount); positive = extra allowance, negative = extra charge */
	rounding?: number;
	totals?: {
		exclVat: number;
		vat: number;
		inclVat: number;
		/** BT-113: previous payments + this payment, in invoice currency */
		prepaid: number;
		/** BT-115: amount remaining due, in invoice currency */
		due: number;
	};
	vatBreakdown?: Array<{ rate: number; country: CountryAlpha2; amount: number }>;
	/**
	 * Actual payment info, shown on the PDF ("Paid with BTC: 0.00123456 BTC —
	 * 1 BTC = 64 998.55 EUR") and as a BT-22 note in the XML. Structured XML
	 * amounts stay in the fiat invoice currency to remain schema-valid.
	 */
	paidWith?: {
		method: PaymentMethod;
		/** For 'point-of-sale' payments, e.g. "cash" or "check" */
		posSubtype?: string;
		/** For method 'custom', the snapshotted label (e.g. "Ethereum") */
		methodLabel?: string;
		paidAt: Date;
		/** Amount in the actual payment currency (e.g. 123456 SAT) */
		amount: Price;
		/** Same amount normalized for display (SAT → BTC) */
		display: { amount: number; currency: Currency };
		/** Value of the payment in the invoice currency at payment time */
		fiatEquivalent: { amount: number; currency: Currency };
		/** Rate at payment time; omitted when payment currency === invoice currency, or
		 * when the settlement currency is an unverified bookkeeping conversion */
		rate?: { base: Currency; quote: Currency; amount: number };
	};

	generation: {
		status: EInvoiceGenerationStatus;
		attempts: number;
		nextAttemptAt: Date;
		error?: string;
		generatedAt?: Date;
	};
	artifacts?: {
		xml: { content: string; sha256: string };
		pdf: {
			storage: 's3' | 'inline';
			key?: string;
			data?: Binary;
			size: number;
			sha256: string;
		};
	};
	transmission: {
		/** PDP adapter id, 'none' until a real platform is registered */
		platform: string;
		status: EInvoiceTransmissionStatus;
		externalId?: string;
	};
	statusHistory: Array<{
		at: Date;
		kind: 'generation' | 'transmission';
		status: string;
		detail?: string;
	}>;
}
