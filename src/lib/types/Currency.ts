import { error } from '@sveltejs/kit';
import type { Price } from './Order';

export const CURRENCIES = [
	'BTC',
	'SAT',
	'AED',
	'AFN',
	'ALL',
	'AMD',
	'ANG',
	'AOA',
	'ARS',
	'AUD',
	'AWG',
	'AZN',
	'BAM',
	'BBD',
	'BDT',
	'BGN',
	'BHD',
	'BIF',
	'BMD',
	'BND',
	'BOB',
	'BRL',
	'BSD',
	'BTN',
	'BWP',
	'BYN',
	'BYR',
	'BZD',
	'CAD',
	'CDF',
	'CHF',
	'CLF',
	'CLP',
	'CNY',
	'COP',
	'CRC',
	'CUC',
	'CUP',
	'CVE',
	'CZK',
	'DJF',
	'DKK',
	'DOP',
	'DZD',
	'EEK',
	'EGP',
	'ERN',
	'ETB',
	'EUR',
	'FJD',
	'FKP',
	'GBP',
	'GEL',
	'GHS',
	'GIP',
	'GMD',
	'GNF',
	'GTQ',
	'GYD',
	'HKD',
	'HNL',
	'HRK',
	'HTG',
	'HUF',
	'IDR',
	'ILS',
	'INR',
	'IQD',
	'IRR',
	'ISK',
	'JMD',
	'JOD',
	'JPY',
	'KES',
	'KGS',
	'KHR',
	'KMF',
	'KPW',
	'KRW',
	'KWD',
	'KYD',
	'KZT',
	'LAK',
	'LBP',
	'LKR',
	'LRD',
	'LSL',
	'LTL',
	'LVL',
	'LYD',
	'MAD',
	'MDL',
	'MGA',
	'MKD',
	'MMK',
	'MNT',
	'MOP',
	'MRO',
	'MRU',
	'MUR',
	'MVR',
	'MWK',
	'MXN',
	'MYR',
	'MZN',
	'NAD',
	'NGN',
	'NIO',
	'NOK',
	'NPR',
	'NZD',
	'OMR',
	'PAB',
	'PEN',
	'PGK',
	'PHP',
	'PKR',
	'PLN',
	'PYG',
	'QAR',
	'RON',
	'RSD',
	'RUB',
	'RWF',
	'SAR',
	'SBD',
	'SCR',
	'SDG',
	'SEK',
	'SGD',
	'SHP',
	'SKK',
	'SLL',
	'SOS',
	'SRD',
	'SSP',
	'STD',
	'SVC',
	'SYP',
	'SZL',
	'THB',
	'TJS',
	'TMM',
	'TMT',
	'TND',
	'TOP',
	'TRY',
	'TTD',
	'TWD',
	'TZS',
	'UAH',
	'UGX',
	'USD',
	'UYU',
	'UZS',
	'VEF',
	'VES',
	'VND',
	'VUV',
	'WST',
	'XAF',
	'XCD',
	'XDR',
	'XOF',
	'XPF',
	'YER',
	'ZAR',
	'ZMK',
	'ZMW',
	'ZWD'
] as const;
export type Currency = (typeof CURRENCIES)[number];

export const SATOSHIS_PER_BTC = 100_000_000;

export const FRACTION_DIGITS_PER_CURRENCY = Object.freeze({
	BTC: 8,
	SAT: 0,
	AED: 2,
	AFN: 2,
	ALL: 2,
	AMD: 2,
	ANG: 2,
	AOA: 2,
	ARS: 2,
	AUD: 2,
	AWG: 2,
	AZN: 2,
	BAM: 2,
	BBD: 2,
	BDT: 2,
	BGN: 2,
	BHD: 2,
	BIF: 2,
	BMD: 2,
	BND: 2,
	BOB: 2,
	BRL: 2,
	BSD: 2,
	BTN: 2,
	BWP: 2,
	BYN: 2,
	BYR: 2,
	BZD: 2,
	CAD: 2,
	CDF: 2,
	CHF: 2,
	CLF: 2,
	CLP: 2,
	CNY: 2,
	COP: 2,
	CRC: 2,
	CUC: 2,
	CUP: 2,
	CVE: 2,
	CZK: 2,
	DJF: 2,
	DKK: 2,
	DOP: 2,
	DZD: 2,
	EEK: 2,
	EGP: 2,
	ERN: 2,
	ETB: 2,
	EUR: 2,
	FJD: 2,
	FKP: 2,
	GBP: 2,
	GEL: 2,
	GHS: 2,
	GIP: 2,
	GMD: 2,
	GNF: 2,
	GTQ: 2,
	GYD: 2,
	HKD: 2,
	HNL: 2,
	HRK: 2,
	HTG: 2,
	HUF: 2,
	IDR: 2,
	ILS: 2,
	INR: 2,
	IQD: 2,
	IRR: 2,
	ISK: 2,
	JMD: 2,
	JOD: 2,
	JPY: 2,
	KES: 2,
	KGS: 2,
	KHR: 2,
	KMF: 2,
	KPW: 2,
	KRW: 2,
	KWD: 2,
	KYD: 2,
	KZT: 2,
	LAK: 2,
	LBP: 2,
	LKR: 2,
	LRD: 2,
	LSL: 2,
	LTL: 2,
	LVL: 2,
	LYD: 2,
	MAD: 2,
	MDL: 2,
	MGA: 2,
	MKD: 2,
	MMK: 2,
	MNT: 2,
	MOP: 2,
	MRO: 2,
	MRU: 2,
	MUR: 2,
	MVR: 2,
	MWK: 2,
	MXN: 2,
	MYR: 2,
	MZN: 2,
	NAD: 2,
	NGN: 2,
	NIO: 2,
	NOK: 2,
	NPR: 2,
	NZD: 2,
	OMR: 2,
	PAB: 2,
	PEN: 2,
	PGK: 2,
	PHP: 2,
	PKR: 2,
	PLN: 2,
	PYG: 2,
	QAR: 2,
	RON: 2,
	RSD: 2,
	RUB: 2,
	RWF: 2,
	SAR: 2,
	SBD: 2,
	SCR: 2,
	SDG: 2,
	SEK: 2,
	SGD: 2,
	SHP: 2,
	SKK: 2,
	SLL: 2,
	SOS: 2,
	SRD: 2,
	SSP: 2,
	STD: 2,
	SVC: 2,
	SYP: 2,
	SZL: 2,
	THB: 2,
	TJS: 2,
	TMM: 2,
	TMT: 2,
	TND: 2,
	TOP: 2,
	TRY: 2,
	TTD: 2,
	TWD: 2,
	TZS: 2,
	UAH: 2,
	UGX: 2,
	USD: 2,
	UYU: 2,
	UZS: 2,
	VEF: 2,
	VES: 2,
	VND: 2,
	VUV: 2,
	WST: 2,
	XAF: 2,
	XCD: 2,
	XDR: 2,
	XOF: 2,
	XPF: 2,
	YER: 2,
	ZAR: 2,
	ZMK: 2,
	ZMW: 2,
	ZWD: 2
}) satisfies Record<Currency, number>;

/**
 * Maximum number of decimal places for storing prices WITHOUT VAT.
 * This allows merchants to set precise base prices that result in round
 * numbers after VAT calculation (e.g., 4.6253 CHF → 5.00 CHF with 8.1% VAT).
 *
 * Display precision remains FRACTION_DIGITS_PER_CURRENCY (2 for most currencies).
 */
const STORAGE_FRACTION_DIGITS_PER_CURRENCY = Object.freeze(
	Object.fromEntries(CURRENCIES.map((c) => [c, c === 'BTC' ? 8 : c === 'SAT' ? 0 : 4]))
) as Record<Currency, number>;

export const CURRENCY_UNIT = Object.freeze(
	Object.fromEntries(CURRENCIES.map((c) => [c, Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY[c])]))
) as Record<Currency, number>;

export function parsePriceAmount(amount: string, currency: Currency): number {
	// Use storage precision (4 decimals for fiat, 8 for BTC) instead of display precision
	const storageDecimals = STORAGE_FRACTION_DIGITS_PER_CURRENCY[currency];
	const priceAmount =
		(parseFloat(amount) * Math.pow(10, storageDecimals)) / Math.pow(10, storageDecimals);

	if (priceAmount > 0 && priceAmount < CURRENCY_UNIT[currency]) {
		throw error(400, `Price must be zero or greater than ${CURRENCY_UNIT[currency]} ${currency}`);
	}

	return priceAmount;
}

/**
 * Compute price for storage in database with full precision.
 * Uses STORAGE_FRACTION_DIGITS_PER_CURRENCY (4 decimals for fiat, 8 for BTC).
 *
 * Use this when saving prices to preserve full precision for VAT calculations.
 *
 * @example
 * computePriceForStorage(4.6253, 'CHF')
 * // Returns: { amount: 4.6253, currency: 'CHF', precision: 4 }
 */
export function computePriceForStorage(amount: string | number, currency: Currency): Price {
	const precision = STORAGE_FRACTION_DIGITS_PER_CURRENCY[currency];
	const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
	const rounded = Math.round(numAmount * Math.pow(10, precision)) / Math.pow(10, precision);

	return {
		amount: rounded,
		currency,
		precision
	};
}

/**
 * Compute price for display to users with standard precision.
 * Uses FRACTION_DIGITS_PER_CURRENCY (2 decimals for fiat, 8 for BTC).
 *
 * Use this for displaying prices in UI when precision field is not needed.
 *
 * @example
 * computePriceForDisplay(4.6253, 'CHF')
 * // Returns: { amount: 4.63, currency: 'CHF' }
 */
export function computePriceForDisplay(amount: string | number, currency: Currency): Price {
	const precision = FRACTION_DIGITS_PER_CURRENCY[currency];
	const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
	const rounded = Math.round(numAmount * Math.pow(10, precision)) / Math.pow(10, precision);

	return {
		amount: rounded,
		currency
	};
}

/**
 * Read price from database and normalize precision field for backward compatibility.
 *
 * Ensures precision is always defined by defaulting to FRACTION_DIGITS_PER_CURRENCY
 * (2 for fiat, 8 for BTC) for old records that don't have precision set.
 *
 * Use this when reading prices from the database to centralize backward compatibility logic.
 *
 * @example
 * // Old record from DB (no precision field):
 * readStoredPrice({ amount: 5.00, currency: 'CHF' })
 * // Returns: { amount: 5.00, currency: 'CHF', precision: 2 }
 *
 * @example
 * // New record from DB (has precision field):
 * readStoredPrice({ amount: 4.6253, currency: 'CHF', precision: 4 })
 * // Returns: { amount: 4.6253, currency: 'CHF', precision: 4 }
 */
export function readStoredPrice(storedPrice: Price): Price {
	return {
		...storedPrice,
		precision: storedPrice.precision ?? FRACTION_DIGITS_PER_CURRENCY[storedPrice.currency]
	};
}

/**
 * When computing VAT, delivery fees, etc, convert everything to SAT and only display
 * the result in the user's currency.
 */
export const UNDERLYING_CURRENCY = 'SAT';

// Crypto currencies (BTC, SAT)
const CRYPTO_CURRENCIES: Currency[] = ['BTC', 'SAT'];

export function sortCurrencies(...prioritized: (Currency | null | undefined)[]): Currency[] {
	const priority = [...prioritized.filter((c): c is Currency => !!c), ...CRYPTO_CURRENCIES].filter(
		(c, i, arr) => arr.indexOf(c) === i
	);

	return [
		...priority,
		...CURRENCIES.filter((c) => !priority.includes(c) && !CRYPTO_CURRENCIES.includes(c))
	];
}

export function currenciesToSelectOptions(
	currencies: Currency[]
): { value: Currency; label: string }[] {
	return currencies.map((c) => ({ value: c, label: c }));
}
