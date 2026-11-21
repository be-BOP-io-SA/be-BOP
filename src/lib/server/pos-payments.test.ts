import { beforeEach, describe, expect, it } from 'vitest';
import { ObjectId } from 'mongodb';
import { cleanDb } from './test-utils';
import { collections } from './database';
import { setExternalRef, settleOverpayment } from './pos-payments';
import type { PosPayment } from '$lib/types/PosPayment';

function posPayment(overrides: Partial<PosPayment> = {}): PosPayment {
	const now = new Date();
	return {
		_id: new ObjectId(),
		number: 1,
		receiptToken: new ObjectId().toHexString(),
		amount: { amount: 10, currency: 'EUR' },
		tip: { amount: 1, currency: 'EUR' },
		noExternalRef: true,
		device: { apiKeyId: new ObjectId(), name: 'Bar' },
		payment: {
			_id: new ObjectId(),
			status: 'paid',
			price: { amount: 11000, currency: 'SAT' },
			currencySnapshot: {
				main: { price: { amount: 11, currency: 'EUR' } },
				priceReference: { price: { amount: 11000, currency: 'SAT' } }
			},
			method: 'lightning'
		},
		createdAt: now,
		updatedAt: now,
		...overrides
	};
}

describe('PoS payments', () => {
	beforeEach(async () => {
		await cleanDb();
	});

	it('attaches the till reference after the payment, and keeps each change', async () => {
		const payment = posPayment();
		await collections.posPayments.insertOne(payment);

		await setExternalRef(payment._id, 'T-42', 'admin');
		await setExternalRef(payment._id, 'T-43', 'admin');

		const stored = await collections.posPayments.findOne({ _id: payment._id });
		expect(stored?.externalRef).toBe('T-43');
		expect(stored?.noExternalRef).toBeUndefined();
		expect(stored?.externalRefHistory?.map((c) => [c.from, c.to])).toEqual([
			[null, 'T-42'],
			['T-42', 'T-43']
		]);
	});

	it('adds an overpayment kept as tip to the tip, once', async () => {
		const payment = posPayment({ overpayment: { amount: { amount: 2, currency: 'EUR' } } });
		await collections.posPayments.insertOne(payment);

		await settleOverpayment(payment, 'tip');
		await settleOverpayment(payment, 'tip');

		const stored = await collections.posPayments.findOne({ _id: payment._id });
		expect(stored?.tip.amount).toBe(3);
		expect(stored?.overpayment?.treatment).toBe('tip');
	});
});
