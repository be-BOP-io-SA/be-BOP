import { error } from '@sveltejs/kit';

export const CURRENCIES = [
	'BTC',
	'CHF',
	'EUR',
	'USD',
	'ZAR',
	'SAT',
	'XOF',
	'XAF',
	'CDF',
	'KES',
	'UGX',
	'GHS',
	'NGN',
	'TZS',
	'MAD',
	'CZK'
] as const;
export type Currency = (typeof CURRENCIES)[number];

export const SATOSHIS_PER_BTC = 100_000_000;

export const FRACTION_DIGITS_PER_CURRENCY = Object.freeze({
	BTC: 8,
	CHF: 2,
	EUR: 2,
	USD: 2,
	ZAR: 2,
	XOF: 2,
	XAF: 2,
	CDF: 2,
	SAT: 0,
	KES: 2,
	UGX: 2,
	GHS: 2,
	NGN: 2,
	TZS: 2,
	MAD: 2,
	CZK: 2
}) satisfies Record<Currency, number>;

/**
 * Maximum number of decimal places for storing prices WITHOUT VAT.
 * This allows merchants to set precise base prices that result in round
 * numbers after VAT calculation (e.g., 4.6253 CHF → 5.00 CHF with 8.1% VAT).
 *
 * Display precision remains FRACTION_DIGITS_PER_CURRENCY (2 for most currencies).
 */
export const STORAGE_FRACTION_DIGITS_PER_CURRENCY = Object.freeze({
	BTC: 8,
	CHF: 4,
	EUR: 4,
	USD: 4,
	ZAR: 4,
	XOF: 4,
	XAF: 4,
	CDF: 4,
	SAT: 0,
	KES: 4,
	UGX: 4,
	GHS: 4,
	NGN: 4,
	TZS: 4,
	MAD: 4,
	CZK: 4
}) satisfies Record<Currency, number>;

export const CURRENCY_UNIT = Object.freeze({
	BTC: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.BTC),
	CHF: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.CHF),
	EUR: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.EUR),
	USD: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.USD),
	ZAR: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.ZAR),
	XOF: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.XOF),
	XAF: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.XAF),
	CDF: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.CDF),
	SAT: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.SAT),
	KES: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.KES),
	UGX: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.UGX),
	GHS: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.GHS),
	NGN: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.NGN),
	TZS: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.TZS),
	MAD: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.MAD),
	CZK: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.CZK)
}) satisfies Record<Currency, number>;

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
 * When computing VAT, delivery fees, etc, convert everything to SAT and only display
 * the result in the user's currency.
 */
export const UNDERLYING_CURRENCY = 'SAT';
