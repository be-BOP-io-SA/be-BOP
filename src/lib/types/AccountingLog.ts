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
	'stockDeduction'
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
	objectType: 'product' | 'vatProfile' | 'order' | 'setting';
	createdAt: Date;
	employee?: {
		userId: ObjectId;
		alias?: string;
	};
}
