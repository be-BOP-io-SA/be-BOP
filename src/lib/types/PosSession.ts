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
	/** Set for the payments taken on paired terminals: they are summed by processor too. */
	processor?: string;
}

/** The terminal payments of a session, against the till's references. */
export interface PosSessionTerminalReconciliation {
	currency: Currency;
	tips: number;
	refs: Array<{ ref: string; amount: number; count: number }>;
	/** Taken while the till was down, and not attached to a reference since. */
	toReconcile: { amount: number; count: number };
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

	/** Computed at closing, for the Z ticket. */
	terminalReconciliation?: PosSessionTerminalReconciliation;
}
