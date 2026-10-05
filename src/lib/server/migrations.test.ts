import { describe, it, expect } from 'vitest';
import { ObjectId } from 'mongodb';
import { cleanDb } from './test-utils';
import { collections, withTransaction } from './database';
import { migrations } from './migrations';

function migration2492() {
	const migration = migrations.find((m) => m._id.equals(new ObjectId('6b1f4880e92e590e85af2492')));
	if (!migration) {
		throw new Error('migration #2492 not found');
	}
	return migration;
}

describe('migration #2492 — drop single-currency (SAT) amount from order.vat', () => {
	it('reduces legacy SAT vat entries to {rate, country} against a live database', async () => {
		await cleanDb();

		const _id = 'legacy-order-2492';
		// Legacy order: VAT amounts wrongly stored in the internal SAT unit (the bug), while the
		// correct per-currency amounts are already frozen in currencySnapshot.
		await collections.orders.insertOne({
			_id,
			vat: [
				{
					price: { amount: 853, currency: 'SAT' },
					partialPrice: { amount: 853, currency: 'SAT' },
					rate: 8.1,
					country: 'CH'
				}
			],
			currencySnapshot: {
				main: {
					totalPrice: { amount: 7.24, currency: 'EUR' },
					vat: [{ amount: 0.54, currency: 'EUR' }]
				},
				priceReference: {
					totalPrice: { amount: 6.66, currency: 'CHF' },
					vat: [{ amount: 0.5, currency: 'CHF' }]
				}
			}
		} as never);

		await withTransaction((session) => migration2492().run(session));

		const migrated = await collections.orders.findOne({ _id });
		// Amount/currency stripped; only the rate breakdown remains.
		expect(migrated?.vat).toEqual([{ rate: 8.1, country: 'CH' }]);
		// The per-currency amounts are untouched and still available.
		expect(migrated?.currencySnapshot.main.vat).toEqual([{ amount: 0.54, currency: 'EUR' }]);
		expect(migrated?.currencySnapshot.priceReference.vat).toEqual([
			{ amount: 0.5, currency: 'CHF' }
		]);
	});

	it('leaves an already-migrated order untouched (idempotent)', async () => {
		await cleanDb();
		const _id = 'already-migrated-2492';
		await collections.orders.insertOne({
			_id,
			vat: [{ rate: 8.1, country: 'CH' }],
			currencySnapshot: {
				main: {
					totalPrice: { amount: 7.24, currency: 'EUR' },
					vat: [{ amount: 0.54, currency: 'EUR' }]
				},
				priceReference: { totalPrice: { amount: 6.66, currency: 'CHF' } }
			}
		} as never);

		await withTransaction((session) => migration2492().run(session));

		const after = await collections.orders.findOne({ _id });
		expect(after?.vat).toEqual([{ rate: 8.1, country: 'CH' }]);
	});
});

describe('migration 0000…11f1 — credential e-mail templates', () => {
	const credentialMigration = () => {
		const found = migrations.find((m) => m._id.equals(new ObjectId('0000000000000000000011f1')));
		if (!found) {
			throw new Error('credential template migration not found');
		}
		return found;
	};

	it('drops only the credential templates that could leak their link', async () => {
		await cleanDb();
		const trapped = {
			subject: 'Password reset',
			html: '<a href="{{resetLink}}">go</a><img src="https://evil.test/p.png">',
			default: false
		};
		const reworded = {
			subject: 'Session',
			html: '<p>Bonjour</p><a href="{{sessionLink}}">Ouvrir</a>',
			default: false
		};
		const other = {
			subject: 'Expired',
			html: '<img src="https://cdn.test/logo.png">',
			default: false
		};
		await collections.runtimeConfig.insertOne({
			_id: 'emailTemplates',
			data: {
				passwordReset: trapped,
				temporarySessionRequest: reworded,
				'order.payment.expired': other
			},
			createdAt: new Date(),
			updatedAt: new Date()
		} as never);

		await withTransaction((session) => credentialMigration().run(session));

		const { data } = (await collections.runtimeConfig.findOne({
			_id: 'emailTemplates'
		})) as never as {
			data: Record<string, unknown>;
		};
		expect(data.passwordReset).toBeUndefined();
		expect(data.temporarySessionRequest).toEqual(reworded);
		expect(data['order.payment.expired']).toEqual(other);
	});

	it('does nothing when no template was ever saved', async () => {
		await cleanDb();

		await withTransaction((session) => credentialMigration().run(session));

		expect(await collections.runtimeConfig.countDocuments()).toBe(0);
	});
});
