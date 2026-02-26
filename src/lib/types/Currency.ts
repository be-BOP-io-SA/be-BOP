import { error } from '@sveltejs/kit';
import type { Price } from './Order';

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
	'CZK',
	'KUDOS'
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
	CZK: 2,
	KUDOS: 2
}) satisfies Record<Currency, number>;

/**
 * Maximum number of decimal places for storing prices WITHOUT VAT.
 * This allows merchants to set precise base prices that result in round
 * numbers after VAT calculation (e.g., 4.6253 CHF → 5.00 CHF with 8.1% VAT).
 *
 * Display precision remains FRACTION_DIGITS_PER_CURRENCY (2 for most currencies).
 */
const STORAGE_FRACTION_DIGITS_PER_CURRENCY = Object.freeze({
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
	CZK: 4,
	KUDOS: 4
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
	CZK: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.CZK),
	KUDOS: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.KUDOS)
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
