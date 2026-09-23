import type { Price } from '$lib/types/Order';
import { fixCurrencyRounding } from '$lib/utils/fixCurrencyRounding';
import { toCurrency } from '$lib/utils/toCurrency';

/** The two units that convert exactly, so a settlement may cross between them. */
const BITCOIN_UNITS: string[] = ['BTC', 'SAT'];

export class SettlementMismatch extends Error {}

/**
 * Checks that what a processor says it received actually covers what the payment is for.
 *
 * A processor prices and settles in its own unit, but the two bitcoin ones price in BTC and
 * settle in SAT; those convert exactly, so the pair is reconciled. Any other divergence means
 * the processor is answering about something else and is refused rather than rate-converted.
 *
 * `fees` is added to the credit because phoenixd nets its channel fee out of what it reports.
 */
export function assertSettlementCovers(
	price: Price,
	received: Price,
	fees?: Price,
	context = 'processor'
): void {
	if (
		received.currency !== price.currency &&
		!(BITCOIN_UNITS.includes(received.currency) && BITCOIN_UNITS.includes(price.currency))
	) {
		throw new SettlementMismatch(
			`${context} settled in ${received.currency}, expected ${price.currency}`
		);
	}

	const credited =
		toCurrency(price.currency, received.amount, received.currency) +
		(fees ? toCurrency(price.currency, fees.amount, fees.currency) : 0);

	if (
		fixCurrencyRounding(credited, price.currency) <
		fixCurrencyRounding(price.amount, price.currency)
	) {
		throw new SettlementMismatch(
			`${context} reported ${credited} ${price.currency} received, less than the ${price.amount} due`
		);
	}
}
