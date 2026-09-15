import { describe, expect, it } from 'vitest';
import {
	bookAmount,
	bookAxes,
	bookSet,
	commonBookCurrencies,
	orderBookCurrencies,
	paymentBookCurrencies,
	paymentPriceSnapshot,
	type BookCurrencies
} from './orderBookkeeping';
import type { Order, OrderPayment, Price } from '$lib/types/Order';
import type { Currency } from '$lib/types/Currency';
import { exchangeRate } from '$lib/stores/exchangeRate';
import { SATOSHIS_PER_BTC } from '$lib/types/Currency';

const price = (amount: number, currency: Currency): Price => ({ amount, currency });

function makeOrder(axes: Partial<Record<string, Currency>>): Order {
	return {
		currencySnapshot: {
			main: { totalPrice: price(10, axes.main ?? 'EUR') },
			priceReference: { totalPrice: price(10, axes.priceReference ?? 'SAT') },
			...(axes.secondary && { secondary: { totalPrice: price(10, axes.secondary) } }),
			...(axes.accounting && { accounting: { totalPrice: price(10, axes.accounting) } })
		}
	} as unknown as Order;
}

function makePayment(axes: Partial<Record<string, Currency>>): OrderPayment {
	return {
		currencySnapshot: {
			main: { price: price(10, axes.main ?? 'EUR') },
			priceReference: { price: price(10, axes.priceReference ?? 'SAT') },
			...(axes.secondary && { secondary: { price: price(10, axes.secondary) } }),
			...(axes.accounting && { accounting: { price: price(10, axes.accounting) } })
		}
	} as unknown as OrderPayment;
}

describe('orderBookkeeping', () => {
	// toCurrency reads this store; 1 BTC = 30 000 EUR keeps the arithmetic checkable.
	exchangeRate.set({ SAT: SATOSHIS_PER_BTC, EUR: 30_000, CHF: 30_000, USD: 30_000 });

	describe('orderBookCurrencies', () => {
		it('reads the two mandatory axes', () => {
			expect(orderBookCurrencies(makeOrder({ main: 'CHF', priceReference: 'SAT' }))).toEqual({
				main: 'CHF',
				priceReference: 'SAT'
			});
		});

		it('omits optional axes the shop has not configured', () => {
			const currencies = orderBookCurrencies(makeOrder({}));

			expect('secondary' in currencies).toBe(false);
			expect('accounting' in currencies).toBe(false);
		});

		it('reads optional axes when present', () => {
			expect(orderBookCurrencies(makeOrder({ secondary: 'CHF', accounting: 'USD' }))).toEqual({
				main: 'EUR',
				priceReference: 'SAT',
				secondary: 'CHF',
				accounting: 'USD'
			});
		});
	});

	describe('paymentBookCurrencies', () => {
		it('reads the axes the payment carries', () => {
			expect(paymentBookCurrencies(makePayment({ accounting: 'USD' }))).toEqual({
				main: 'EUR',
				priceReference: 'SAT',
				accounting: 'USD'
			});
		});
	});

	describe('commonBookCurrencies', () => {
		it('keeps only the axes both documents carry', () => {
			const order = makeOrder({ secondary: 'CHF', accounting: 'USD' });
			const payment = makePayment({ secondary: 'CHF' });

			expect(commonBookCurrencies(order, payment)).toEqual({
				main: 'EUR',
				priceReference: 'SAT',
				secondary: 'CHF'
			});
		});

		it('drops an axis the order lost, so no half-built subdocument is written', () => {
			const order = makeOrder({});
			const payment = makePayment({ accounting: 'USD' });

			expect('accounting' in commonBookCurrencies(order, payment)).toBe(false);
		});
	});

	describe('bookAxes', () => {
		it('enumerates the configured axes in a stable order', () => {
			expect(bookAxes({ main: 'EUR', priceReference: 'SAT', accounting: 'USD' })).toEqual([
				['main', 'EUR'],
				['priceReference', 'SAT'],
				['accounting', 'USD']
			]);
		});
	});

	describe('bookAmount', () => {
		it('converts into the target currency', () => {
			expect(bookAmount('SAT', price(1, 'BTC'))).toEqual({
				amount: SATOSHIS_PER_BTC,
				currency: 'SAT'
			});
		});

		it('is a no-op when the currency already matches', () => {
			expect(bookAmount('EUR', price(12.34, 'EUR'))).toEqual({ amount: 12.34, currency: 'EUR' });
		});
	});

	describe('paymentPriceSnapshot', () => {
		it('projects one price into every configured axis', () => {
			const snapshot = paymentPriceSnapshot(
				{ main: 'EUR', priceReference: 'SAT', secondary: 'CHF' },
				price(1, 'BTC')
			);

			expect(snapshot.main.price).toEqual({ amount: 30_000, currency: 'EUR' });
			expect(snapshot.priceReference.price).toEqual({
				amount: SATOSHIS_PER_BTC,
				currency: 'SAT'
			});
			expect(snapshot.secondary?.price).toEqual({ amount: 30_000, currency: 'CHF' });
			expect(snapshot.accounting).toBeUndefined();
		});
	});

	describe('bookSet', () => {
		const currencies: BookCurrencies = {
			main: 'EUR',
			priceReference: 'SAT',
			accounting: 'CHF'
		};

		it('writes one dotted path per configured axis', () => {
			const set = bookSet(currencies, 'payments.$.currencySnapshot', 'received', price(1, 'BTC'));

			expect(Object.keys(set)).toEqual([
				'payments.$.currencySnapshot.main.received',
				'payments.$.currencySnapshot.priceReference.received',
				'payments.$.currencySnapshot.accounting.received'
			]);
			expect(set['payments.$.currencySnapshot.main.received']).toEqual({
				amount: 30_000,
				currency: 'EUR'
			});
		});

		it('never writes an axis the shop has not configured', () => {
			const set = bookSet(currencies, 'currencySnapshot', 'totalReceived', price(1, 'BTC'));

			expect(Object.keys(set)).not.toContain('currencySnapshot.secondary.totalReceived');
		});

		it('accepts a per-axis computation instead of a conversion', () => {
			const set = bookSet(currencies, 'currencySnapshot', 'totalReceived', (currency, axis) => ({
				currency,
				amount: axis === 'main' ? 1 : 2
			}));

			expect(set['currencySnapshot.main.totalReceived']).toEqual({ amount: 1, currency: 'EUR' });
			expect(set['currencySnapshot.accounting.totalReceived']).toEqual({
				amount: 2,
				currency: 'CHF'
			});
		});
	});
});
