import type { ObjectId } from 'mongodb';

export const ACCOUNTING_EVENT_TYPES = [
	'vatProfileCreation',
	'vatProfileUpdate',
	'vatProfileDeletion',
	'vatSettingsUpdate',
	'productPriceUpdate',
	'productVatUpdate',
	'paymentCall',
	'paymentDone',
	'paymentReplace',
	'paymentCancel',
	// A payment taken on a terminal changed after the fact: its till reference, or its tip.
	'posPaymentUpdate',
	'orderPaid',
	'stockUpdate',
	'stockDeduction',
	// Public 0-criteria percentage discount lifecycle (issue #2504): treated as a
	// nominal change of the public price so it shows up in the product price calendar.
	'discountPublicPriceChange'
] as const;

export type AccountingEventType = (typeof ACCOUNTING_EVENT_TYPES)[number];

export type AccountingLogValue =
	| Record<string, unknown>
	| string
	| number
	| boolean
	| string[]
	| null;

export interface AccountingLog {
	_id: ObjectId;
	eventType: AccountingEventType;
	before: AccountingLogValue;
	after: AccountingLogValue;
	objectId: string;
	objectType: 'product' | 'vatProfile' | 'order' | 'setting' | 'discount' | 'posPayment';
	/**
	 * Where the transaction comes from: `pos` for a payment taken on a paired terminal (PoS mode).
	 * Absent on every other entry, the orders of the shop included.
	 */
	origin?: 'pos';
	createdAt: Date;
	employee?: {
		userId: ObjectId;
		alias?: string;
	};
}
