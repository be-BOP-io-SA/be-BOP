import type { ObjectId } from 'mongodb';
import type { OrderPayment, Price } from './Order';
import type { Timestamps } from './Timestamps';

/**
 * A payment taken on a paired terminal, without an order nor an invoice: the terminal only knows
 * an amount, a tip and, when the till is up, the till's own order reference.
 */
export interface PosPayment extends Timestamps {
	/** A string, a crypto UUID, as for the orders: anyone having access to it can reach the payment. */
	_id: string;
	/** Its own sequence, apart from the orders' numbers: shown on the receipt and in the wallet. */
	number: number;
	/** Unguessable: the address of the public receipt the customer scans. */
	receiptToken: string;
	/** The sale, in the shop's main currency. */
	amount: Price;
	/** Kept apart from the sale, in the shop's main currency. */
	tip: Price;
	/**
	 * The till's order reference. Optional and not unique: several payments may settle one till order.
	 * Absent with `noExternalRef` when the till was down, until someone attaches it.
	 */
	externalRef?: string;
	/** Taken while the till was down: the reference is still to attach. */
	noExternalRef?: boolean;
	/** Every change of the reference after the payment was taken, oldest first. */
	externalRefHistory?: Array<{ from: string | null; to: string; at: Date; by?: string }>;
	/** The terminal that took it: the API key it is paired with. */
	device: { apiKeyId: ObjectId; name: string };
	/** The operator signed in on the terminal when it was taken (arm-pos). */
	operator?: { userId: ObjectId; alias: string };
	/**
	 * Shaped like an order payment so that every payment processor reads it as it reads those.
	 * Its price is the sale plus the tip, in the processor's settlement currency.
	 */
	payment: OrderPayment;
	/** More arrived than asked: what the terminal decided to do with the difference. */
	overpayment?: { amount: Price; treatment?: 'tip' | 'refund'; decidedAt?: Date };
}
