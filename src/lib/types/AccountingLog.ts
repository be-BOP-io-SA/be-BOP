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
	objectType: 'product' | 'vatProfile' | 'order' | 'setting' | 'discount';
	createdAt: Date;
	employee?: {
		userId: ObjectId;
		alias?: string;
	};
}
