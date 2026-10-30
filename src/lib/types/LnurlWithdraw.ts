import type { ObjectId } from 'mongodb';
import type { Timestamps } from './Timestamps';
import type { Currency } from './Currency';

export const LNURL_WITHDRAW_STATUSES = ['open', 'paying', 'paid', 'failed'] as const;
export type LnurlWithdrawStatus = (typeof LNURL_WITHDRAW_STATUSES)[number];

/**
 * A withdraw the shop offers: someone scans it and the shop's node pays their invoice.
 *
 * The money leaves on a stranger's request, so the record is the guard. `k1` is the secret the
 * wallet must echo back, `status` is what makes a withdraw single-use — it is moved to `paying`
 * atomically before anything is paid — and `expiresAt` retires a link that was printed and
 * forgotten.
 */
export interface LnurlWithdraw extends Timestamps {
	/** Public id, the one that travels in the scanned URL. */
	_id: string;
	/** Secret echoed by the wallet on the callback, per LUD-03. */
	k1: string;
	minSat: number;
	maxSat: number;
	description: string;
	status: LnurlWithdrawStatus;
	expiresAt: Date;
	/** The API key that asked for it — a withdraw is always attributable. */
	apiKeyId: ObjectId;
	/** The order this withdraw settles, when the caller named one. */
	orderId?: string;
	/**
	 * What the caller actually asked for, when the amount was named in a currency rather than in
	 * sats. Kept because the rate moves: a ticket that says "4,00 CHF" must stay explainable a week
	 * later, when the same sats are no longer worth four francs.
	 */
	requestedAmount?: number;
	requestedCurrency?: Currency;
	/** Set once the shop's node has paid. */
	paidAt?: Date;
	paidSat?: number;
	feeSat?: number;
	paymentHash?: string;
	/** Why the payment failed, kept so the shop can tell the customer something. */
	failureReason?: string;
}
