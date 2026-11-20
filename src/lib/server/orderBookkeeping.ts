import type { Currency } from '$lib/types/Currency';
import type { Order, OrderPayment, Price } from '$lib/types/Order';
import { toCurrency } from '$lib/utils/toCurrency';

/** The four currencies every monetary amount of an order is booked in. */
export type BookAxis = 'main' | 'priceReference' | 'secondary' | 'accounting';

/**
 * `secondary` and `accounting` are absent when the shop has not configured them.
 * Frozen when the order is created, so later shop reconfiguration cannot split an
 * order's amounts across two currencies.
 */
export type BookCurrencies = {
	main: Currency;
	priceReference: Currency;
	secondary?: Currency;
	accounting?: Currency;
};

export function orderBookCurrencies(order: Order): BookCurrencies {
	return {
		main: order.currencySnapshot.main.totalPrice.currency,
		priceReference: order.currencySnapshot.priceReference.totalPrice.currency,
		...(order.currencySnapshot.secondary && {
			secondary: order.currencySnapshot.secondary.totalPrice.currency
		}),
		...(order.currencySnapshot.accounting && {
			accounting: order.currencySnapshot.accounting.totalPrice.currency
		})
	};
}

export function paymentBookCurrencies(payment: OrderPayment): BookCurrencies {
	return {
		main: payment.currencySnapshot.main.price.currency,
		priceReference: payment.currencySnapshot.priceReference.price.currency,
		...(payment.currencySnapshot.secondary && {
			secondary: payment.currencySnapshot.secondary.price.currency
		}),
		...(payment.currencySnapshot.accounting && {
			accounting: payment.currencySnapshot.accounting.price.currency
		})
	};
}

/** The axes both the order and the payment carry, so a `$set` never creates a half-built subdocument. */
export function commonBookCurrencies(order: Order, payment: OrderPayment): BookCurrencies {
	const orderCurrencies = orderBookCurrencies(order);
	const paymentCurrencies = paymentBookCurrencies(payment);

	return {
		main: paymentCurrencies.main,
		priceReference: paymentCurrencies.priceReference,
		...(orderCurrencies.secondary &&
			paymentCurrencies.secondary && { secondary: paymentCurrencies.secondary }),
		...(orderCurrencies.accounting &&
			paymentCurrencies.accounting && { accounting: paymentCurrencies.accounting })
	};
}

export function bookAxes(currencies: BookCurrencies): Array<[BookAxis, Currency]> {
	return (['main', 'priceReference', 'secondary', 'accounting'] as const).flatMap((axis) => {
		const currency = currencies[axis];
		return currency ? [[axis, currency] as [BookAxis, Currency]] : [];
	});
}

export function bookAmount(currency: Currency, price: Price): Price {
	return { currency, amount: toCurrency(currency, price.amount, price.currency) };
}

/** The `currencySnapshot` a freshly created payment carries: its price, in every booked currency. */
export function paymentPriceSnapshot(
	currencies: BookCurrencies,
	price: Price
): OrderPayment['currencySnapshot'] {
	return {
		main: { price: bookAmount(currencies.main, price) },
		priceReference: { price: bookAmount(currencies.priceReference, price) },
		...(currencies.secondary && {
			secondary: { price: bookAmount(currencies.secondary, price) }
		}),
		...(currencies.accounting && {
			accounting: { price: bookAmount(currencies.accounting, price) }
		})
	};
}

/**
 * `$set` entries writing one amount under `<prefix>.<axis>.<field>`, one per booked currency.
 * Pass a function when the amount is computed per axis rather than converted from a single price.
 */
export function bookSet(
	currencies: BookCurrencies,
	prefix: string,
	field: string,
	value: Price | ((currency: Currency, axis: BookAxis) => Price)
): Record<string, Price> {
	return Object.fromEntries(
		bookAxes(currencies).map(([axis, currency]) => [
			`${prefix}.${axis}.${field}`,
			typeof value === 'function' ? value(currency, axis) : bookAmount(currency, value)
		])
	);
}
