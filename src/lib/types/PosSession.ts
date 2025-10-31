import type { ObjectId } from 'mongodb';
import type { Currency } from './Currency';
import type { Timestamps } from './Timestamps';
import type { PaymentMethod } from '$lib/server/payment-methods';

export type PosSessionStatus = 'active' | 'closed';

export interface PosSessionUser {
	userId: ObjectId;
	userLogin: string;
	userAlias?: string;
}

export interface PosSessionIncome {
	paymentMethod: PaymentMethod;
	paymentSubtype?: string;
	amount: number;
	currency: Currency;
	originalAmount?: number;
	originalCurrency?: Currency;
}

export interface PosSessionOutcome {
	category: string;
	amount: number;
	currency: Currency;
}

export interface PosSessionXTicket {
	generatedAt: Date;
	generatedBy: PosSessionUser;
}

export interface PosSession extends Timestamps {
	_id: ObjectId;
	status: PosSessionStatus;

	openedAt: Date;
	openedBy: PosSessionUser;

	closedAt?: Date;
	closedBy?: PosSessionUser;

	cashOpening: {
		amount: number;
		currency: Currency;
	};

	cashClosing?: {
		amount: number;
		currency: Currency;
	};

	cashClosingTheoretical?: {
		amount: number;
		currency: Currency;
	};

	cashDelta?: {
		amount: number;
		currency: Currency;
	};

	cashDeltaJustification?: string;

	dailyIncomes: PosSessionIncome[];
	dailyOutcomes: PosSessionOutcome[];

	xTickets: PosSessionXTicket[];
}
