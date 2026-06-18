import type { ObjectId } from 'mongodb';
import type { Timestamps } from './Timestamps';

export const CHECKOUT_FIELD_TYPES = ['options', 'free', 'address'] as const;
export type CheckoutFieldType = (typeof CHECKOUT_FIELD_TYPES)[number];

export const FREE_INPUT_FORMATS = ['text', 'number', 'alphanumeric'] as const;
export type FreeInputFormat = (typeof FREE_INPUT_FORMATS)[number];

export interface CheckoutFieldConfig extends Timestamps {
	_id: ObjectId;
	slug: string;
	name: string;
	label: string;
	type: CheckoutFieldType;
	options?: string[];
	free?: { maxLength?: number; format?: FreeInputFormat };
	required?: boolean;
	disabled?: boolean;
	isPersonalData?: boolean;
	sortOrder: number;
}

export interface CheckoutFieldDisplay {
	slug: string;
	label: string;
	type: CheckoutFieldType;
	required?: boolean;
	options?: string[];
	free?: { maxLength?: number; format?: FreeInputFormat };
	isPersonalData?: boolean;
}
