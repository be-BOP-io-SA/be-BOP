import { collections } from './database';
import { runtimeConfig } from './runtime-config';
import type { PosSession, PosSessionUser, PosSessionIncome } from '$lib/types/PosSession';
import { ObjectId } from 'mongodb';
import { error } from '@sveltejs/kit';
import type { Currency } from '$lib/types/Currency';
import { FRACTION_DIGITS_PER_CURRENCY } from '$lib/types/Currency';
import { queueEmail } from './email';
import type { PaymentMethod } from './payment-methods';

export async function getCurrentPosSession(): Promise<PosSession | null> {
	return await collections.posSessions.findOne({ status: 'active' }, { sort: { openedAt: -1 } });
}

export async function getLastClosedSession(): Promise<PosSession | null> {
	return await collections.posSessions.findOne({ status: 'closed' }, { sort: { closedAt: -1 } });
}

export async function openPosSession(params: {
	cashOpening: { amount: number; currency: Currency };
	user: PosSessionUser;
}): Promise<ObjectId> {
	if (!runtimeConfig.posSession.enabled) {
		throw error(400, 'POS sessions are not enabled');
	}

	const existingSession = await getCurrentPosSession();
	if (existingSession) {
		throw error(400, 'There is already an active POS session');
	}

	const lastSession = await getLastClosedSession();
	const yesterdayClosing = lastSession?.cashClosing;

	if (
		yesterdayClosing &&
		(yesterdayClosing.amount !== params.cashOpening.amount ||
			yesterdayClosing.currency !== params.cashOpening.currency)
	) {
		const adminEmail = runtimeConfig.sellerIdentity?.contact.email;
		if (adminEmail) {
			await queueEmail(adminEmail, 'pos.cash.mismatch', {
				expectedAmount: yesterdayClosing.amount.toString(),
				expectedCurrency: yesterdayClosing.currency,
				actualAmount: params.cashOpening.amount.toString(),
				actualCurrency: params.cashOpening.currency,
				openedBy: params.user.userAlias || params.user.userLogin,
				openedAt: new Date().toLocaleString()
			});
		}
	}

	const session: PosSession = {
		_id: new ObjectId(),
		status: 'active',
		openedAt: new Date(),
		openedBy: params.user,
		cashOpening: params.cashOpening,
		dailyIncomes: [],
		dailyOutcomes: [],
		xTickets: [],
		createdAt: new Date(),
		updatedAt: new Date()
	};

	await collections.posSessions.insertOne(session);
	return session._id;
}

export async function calculateDailyIncomes(session: PosSession): Promise<PosSessionIncome[]> {
	const orders = await collections.orders
		.find({
			createdAt: { $gte: session.openedAt },
			status: 'paid'
		})
		.toArray();

	const paidPayments = orders.flatMap((order) => order.payments).filter((p) => p.status === 'paid');

	const incomes = new Map<
		string,
		{
			paymentMethod: PaymentMethod;
			paymentSubtype?: string;
			amount: number;
			currency: Currency;
			originalAmount?: number;
			originalCurrency?: Currency;
		}
	>();

	paidPayments.forEach((payment) => {
		const accountingPrice =
			payment.currencySnapshot.accounting?.price ?? payment.currencySnapshot.main.price;
		const originalPrice = payment.currencySnapshot.main.price;

		const cashbackAmount = payment.cashbackAmount?.amount ?? 0;
		const realAccountingAmount = accountingPrice.amount + cashbackAmount;
		const realOriginalAmount = originalPrice.amount + cashbackAmount;

		const key = payment.posSubtype ? `${payment.method} / ${payment.posSubtype}` : payment.method;

		const existing = incomes.get(key);
		if (existing) {
			existing.amount += realAccountingAmount;
			if (
				existing.originalCurrency &&
				existing.originalCurrency === originalPrice.currency &&
				originalPrice.currency !== accountingPrice.currency
			) {
				existing.originalAmount = (existing.originalAmount ?? 0) + realOriginalAmount;
			}
		} else {
			incomes.set(key, {
				paymentMethod: payment.method,
				...(payment.posSubtype && { paymentSubtype: payment.posSubtype }),
				amount: realAccountingAmount,
				currency: accountingPrice.currency,
				...(originalPrice.currency !== accountingPrice.currency && {
					originalAmount: realOriginalAmount,
					originalCurrency: originalPrice.currency
				})
			});
		}
	});

	return Array.from(incomes.values());
}

export async function calculateTotalCashback(
	session: PosSession
): Promise<{ amount: number; currency: Currency }> {
	const orders = await collections.orders
		.find({
			createdAt: { $gte: session.openedAt },
			status: 'paid',
			'payments.cashbackAmount': { $exists: true }
		})
		.toArray();

	const paidPayments = orders.flatMap((order) => order.payments).filter((p) => p.status === 'paid');

	// Sum cashback amounts (only non-cash POS payments)
	const cashbackTotal = paidPayments
		.filter((p) => p.cashbackAmount && p.posSubtype !== 'cash')
		.reduce((sum, p) => sum + (p.cashbackAmount?.amount ?? 0), 0);

	return { amount: cashbackTotal, currency: session.cashOpening.currency };
}

export async function closePosSession(params: {
	sessionId: ObjectId;
	cashClosing: { amount: number; currency: Currency };
	outcomes: Array<{ category: string; amount: number; currency: Currency }>;
	cashDeltaJustification?: string;
	user: PosSessionUser;
}): Promise<{ session: PosSession; zTicketText: string }> {
	const session = await collections.posSessions.findOne({ _id: params.sessionId });

	if (!session) {
		throw error(404, 'POS session not found');
	}

	if (session.status === 'closed') {
		throw error(400, 'POS session is already closed');
	}

	const dailyIncomes = await calculateDailyIncomes(session);
	const cashbackTotal = await calculateTotalCashback(session);

	// Build all outcomes including auto-calculated cashback
	const allOutcomes = [
		...params.outcomes,
		...(cashbackTotal.amount > 0
			? [
					{
						category: 'Cashback to customer',
						amount: cashbackTotal.amount,
						currency: cashbackTotal.currency
					}
			  ]
			: [])
	];

	const cashIncome = dailyIncomes
		.filter((inc) => inc.paymentSubtype === 'cash')
		.reduce((sum, inc) => sum + inc.amount, 0);
	const totalOutcomes = allOutcomes.reduce((sum, outcome) => sum + outcome.amount, 0);
	const cashClosingTheoretical = {
		amount: session.cashOpening.amount + cashIncome - totalOutcomes,
		currency: session.cashOpening.currency
	};

	const cashDelta = {
		amount: params.cashClosing.amount - cashClosingTheoretical.amount,
		currency: session.cashOpening.currency
	};

	if (
		Math.abs(cashDelta.amount) > 0.01 &&
		runtimeConfig.posSession.cashDeltaJustificationMandatory &&
		!params.cashDeltaJustification?.trim()
	) {
		throw error(400, 'Justification is required when there is a cash difference');
	}

	const updatedSession: PosSession = {
		...session,
		status: 'closed',
		closedAt: new Date(),
		closedBy: params.user,
		cashClosing: params.cashClosing,
		cashClosingTheoretical,
		cashDelta,
		cashDeltaJustification: params.cashDeltaJustification,
		dailyIncomes,
		dailyOutcomes: allOutcomes,
		updatedAt: new Date()
	};

	await collections.posSessions.replaceOne({ _id: params.sessionId }, updatedSession);

	const zTicketText = generateZTicketText(updatedSession);

	return { session: updatedSession, zTicketText };
}

export async function generateXTicket(params: {
	sessionId: ObjectId;
	user: PosSessionUser;
}): Promise<string> {
	const session = await collections.posSessions.findOne({ _id: params.sessionId });

	if (!session) {
		throw error(404, 'POS session not found');
	}

	if (session.status !== 'active') {
		throw error(400, 'POS session is not active');
	}

	const dailyIncomes = await calculateDailyIncomes(session);

	await collections.posSessions.updateOne(
		{ _id: params.sessionId },
		{
			$push: {
				xTickets: {
					generatedAt: new Date(),
					generatedBy: params.user
				}
			},
			$set: {
				updatedAt: new Date()
			}
		}
	);

	return generateXTicketText(session, dailyIncomes);
}

export function generateZTicketText(session: PosSession): string {
	const currency =
		runtimeConfig.accountingCurrency ??
		session.dailyIncomes[0]?.currency ??
		session.cashOpening.currency;
	const totalIncome = session.dailyIncomes.reduce((sum, inc) => sum + inc.amount, 0);
	const totalOutcome = session.dailyOutcomes.reduce((sum, out) => sum + out.amount, 0);
	const cashIncome = session.dailyIncomes
		.filter((i) => i.paymentSubtype === 'cash')
		.reduce((sum, inc) => sum + inc.amount, 0);
	const cashOutcomes = totalOutcome;

	const incomeLines = session.dailyIncomes
		.map((inc) => {
			const methodDisplay = inc.paymentSubtype
				? `${inc.paymentMethod} / ${inc.paymentSubtype}`
				: inc.paymentMethod;
			if (inc.originalAmount && inc.originalCurrency) {
				return `  - ${methodDisplay} : ${inc.originalAmount.toFixed(
					FRACTION_DIGITS_PER_CURRENCY[inc.originalCurrency]
				)} ${inc.originalCurrency} (${inc.amount.toFixed(2)} ${currency})`;
			}
			return `  - ${methodDisplay} : ${inc.amount.toFixed(2)} ${currency}`;
		})
		.join('\n');

	const outcomeLines = session.dailyOutcomes
		.map((out) => `  - ${out.category} : ${out.amount.toFixed(2)} ${currency}`)
		.join('\n');

	return `${runtimeConfig.brandName} Z ticket
Opening time : ${session.openedAt.toLocaleString()} by ${
		session.openedBy.userAlias || session.openedBy.userLogin || session.openedBy.userId
	}
Closing time : ${session.closedAt?.toLocaleString()} by ${
		session.closedBy?.userAlias || session.closedBy?.userLogin || session.closedBy?.userId
	}${
		session.cashDelta && Math.abs(session.cashDelta.amount) > 0.01
			? '\nDaily Z includes cash balance error'
			: ''
	}

Daily incomes :
${incomeLines}
Daily incomes total :
  - ${totalIncome.toFixed(2)} ${currency}

Daily outcomes :
${outcomeLines}
Daily outcomes total :
  - ${totalOutcome.toFixed(2)} ${currency}

Daily delta : ${totalIncome - totalOutcome >= 0 ? '+' : ''}${(totalIncome - totalOutcome).toFixed(
		2
	)} ${currency}

Cash balance :
  - Initial cash at opening : ${session.cashOpening.amount.toFixed(2)} ${
		session.cashOpening.currency
	}
  - Daily cash incomes : ${cashIncome.toFixed(2)} ${currency}
  - Daily cash outcomes : ${cashOutcomes.toFixed(2)} ${currency}${
		session.cashClosing
			? `\n  - Remaining cash at daily closing : ${session.cashClosing.amount.toFixed(2)} ${
					session.cashClosing.currency
			  }`
			: ''
	}${
		session.cashClosingTheoretical
			? `\n  - Theorical remaining cash at daily closing : ${session.cashClosingTheoretical.amount.toFixed(
					2
			  )} ${session.cashClosingTheoretical.currency}`
			: ''
	}${
		session.cashDelta
			? `\nCash delta : ${
					session.cashDelta.amount >= 0 ? '+' : ''
			  }${session.cashDelta.amount.toFixed(2)} ${session.cashDelta.currency}`
			: ''
	}${session.cashDeltaJustification ? `\n  - Motive : ${session.cashDeltaJustification}` : ''}`;
}

function generateXTicketText(session: PosSession, dailyIncomes: PosSessionIncome[]): string {
	const currency =
		runtimeConfig.accountingCurrency ?? dailyIncomes[0]?.currency ?? session.cashOpening.currency;
	const totalIncome = dailyIncomes.reduce((sum, inc) => sum + inc.amount, 0);

	const incomeLines = dailyIncomes
		.map((inc) => {
			const methodDisplay = inc.paymentSubtype
				? `${inc.paymentMethod} / ${inc.paymentSubtype}`
				: inc.paymentMethod;
			if (inc.originalAmount && inc.originalCurrency) {
				return `  - ${methodDisplay} : ${inc.originalAmount.toFixed(
					FRACTION_DIGITS_PER_CURRENCY[inc.originalCurrency]
				)} ${inc.originalCurrency} (${inc.amount.toFixed(2)} ${currency})`;
			}
			return `  - ${methodDisplay} : ${inc.amount.toFixed(2)} ${currency}`;
		})
		.join('\n');

	return `${runtimeConfig.brandName} X ticket
Opening time : ${session.openedAt.toLocaleString()} by ${
		session.openedBy.userAlias || session.openedBy.userLogin || session.openedBy.userId
	}
X ticket current time : ${new Date().toLocaleString()} by ${
		session.openedBy.userAlias || session.openedBy.userLogin || session.openedBy.userId
	}

Daily incomes so far :
${incomeLines}
Daily incomes total so far :
  - ${totalIncome.toFixed(2)} ${currency}`;
}
