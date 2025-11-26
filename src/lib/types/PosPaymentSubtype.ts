import type { ObjectId } from 'mongodb';
import type { Timestamps } from './Timestamps';
import type { PaymentProcessor } from '$lib/server/payment-methods';

export interface PosPaymentSubtype extends Timestamps {
	_id: ObjectId;
	slug: string;
	name: string;
	description?: string;
	tapToPay?: {
		processor: PaymentProcessor;
		onActivationUrl?: string;
	};
	disabled?: boolean;
	paymentDetailRequired?: boolean;
	sortOrder: number;
}
