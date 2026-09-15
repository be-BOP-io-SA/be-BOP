import type { ObjectId } from 'mongodb';
import type { Timestamps } from './Timestamps';

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
	/** Set once the shop's node has paid. */
	paidAt?: Date;
	paidSat?: number;
	feeSat?: number;
	paymentHash?: string;
	/** Why the payment failed, kept so the shop can tell the customer something. */
	failureReason?: string;
}
