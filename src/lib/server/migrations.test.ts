import { describe, it, expect } from 'vitest';
import { ObjectId } from 'mongodb';
import { cleanDb } from './test-utils';
import { collections, withTransaction } from './database';
import { ensureDefaultSearchlist, ensureSearchSearchlist, migrations } from './migrations';
import { TEST_BOOKING_SPEC, TEST_DIGITAL_PRODUCT } from './seed/product';

function migrationById(id: string) {
	const migration = migrations.find((m) => m._id.equals(new ObjectId(id)));
	if (!migration) {
		throw new Error(`migration ${id} not found`);
	}
	return migration;
}

function migration2492() {
	return migrationById('6b1f4880e92e590e85af2492');
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

describe('migration #2568, drop the null booking spec of products', () => {
	it('unsets a null booking spec and keeps a real one', async () => {
		await cleanDb();
		await collections.products.insertMany([
			{
				...TEST_DIGITAL_PRODUCT,
				_id: 'null-spec',
				alias: ['null-spec'],
				bookingSpec: null
			} as never,
			{
				...TEST_DIGITAL_PRODUCT,
				_id: 'booking',
				alias: ['booking'],
				bookingSpec: TEST_BOOKING_SPEC
			},
			{ ...TEST_DIGITAL_PRODUCT, _id: 'plain', alias: ['plain'] }
		]);
		const migration = migrationById('6b1f4880e92e590e85af2568');

		for (let run = 0; run < 2; run++) {
			await withTransaction((session) => migration.run(session));

			expect(await collections.products.findOne({ _id: 'null-spec' })).not.toHaveProperty(
				'bookingSpec'
			);
			expect((await collections.products.findOne({ _id: 'booking' }))?.bookingSpec).toEqual(
				TEST_BOOKING_SPEC
			);
			expect(await collections.products.findOne({ _id: 'plain' })).not.toHaveProperty(
				'bookingSpec'
			);
		}
	});
});

describe('built-in searchlists seeding', () => {
	it('survives several instances seeding an empty database at the same time', async () => {
		await cleanDb();

		await Promise.all(
			Array.from({ length: 5 }, () =>
				Promise.all([ensureDefaultSearchlist(), ensureSearchSearchlist()])
			)
		);

		expect((await collections.searchlists.find().toArray()).map((list) => list._id).sort()).toEqual(
			['default', 'search']
		);
	});

	it('leaves a list the shop already customised untouched', async () => {
		await cleanDb();
		await ensureDefaultSearchlist();
		await collections.searchlists.updateOne({ _id: 'default' }, { $set: { name: 'Mine' } });

		await ensureDefaultSearchlist();

		expect((await collections.searchlists.findOne({ _id: 'default' }))?.name).toBe('Mine');
	});
});
