import { afterEach, describe, it, expect, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import { cleanDb } from './test-utils';
import { collections, withTransaction } from './database';
import { ensureDefaultSearchlist, ensureSearchSearchlist, migrations } from './migrations';
import { computeReportingSynthesis, parseReportingFilters, type ReportingOrder } from './reporting';
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

const MIGRATION_VAT_ARRAY = '65bd8fc40914f6a599ede07d';

describe('migration — Convert VAT rate to array in orders', () => {
	// Guards the historical path: it passes with or without the filter fix below.
	it('still converts an order whose vat is a single object', async () => {
		await cleanDb();

		const _id = 'legacy-order-vat-array';
		await collections.orders.insertOne({
			_id,
			vat: { price: { amount: 100, currency: 'EUR' }, rate: 8.1, country: 'CH' },
			items: [{ quantity: 1 }, { quantity: 2 }]
		} as never);

		await withTransaction((session) => migrationById(MIGRATION_VAT_ARRAY).run(session));

		const migrated = await collections.orders.findOne({ _id });
		expect(migrated?.vat).toEqual([
			{ price: { amount: 100, currency: 'EUR' }, rate: 8.1, country: 'CH' }
		]);
		for (const item of migrated?.items ?? []) {
			expect(item.vatRate).toBe(8.1);
		}
	});

	it('leaves an order whose vat is already a list untouched', async () => {
		await cleanDb();

		const _id = 'order-already-in-list-format';
		const order = {
			_id,
			vat: [{ price: { amount: 100, currency: 'EUR' }, rate: 8.1, country: 'CH' }],
			items: [
				{ quantity: 1, vatRate: 8.1 },
				{ quantity: 2, vatRate: 2.6 }
			],
			currencySnapshot: {
				main: { vat: [{ amount: 100, currency: 'EUR' }] },
				priceReference: { vat: [{ amount: 100, currency: 'EUR' }] },
				secondary: { vat: [{ amount: 0.001, currency: 'BTC' }] }
			}
		};
		await collections.orders.insertOne(order as never);

		await withTransaction((session) => migrationById(MIGRATION_VAT_ARRAY).run(session));

		expect(await collections.orders.findOne({ _id })).toEqual(order);
	});

	// Guards the three currency snapshot filters: they match a snapshot vat held as one object, with or without the filter fix.
	it('wraps each currency snapshot vat held as one object, leaving the rest of the order alone', async () => {
		await cleanDb();

		const _id = 'order-snapshot-vat-objects';
		const vat = [{ rate: 8.1, country: 'CH' }];
		const items = [{ quantity: 1, vatRate: 8.1 }];
		await collections.orders.insertOne({
			_id,
			vat,
			items,
			currencySnapshot: {
				main: { vat: { amount: 100, currency: 'EUR' } },
				priceReference: { vat: { amount: 100, currency: 'EUR' } },
				secondary: { vat: { amount: 0.001, currency: 'BTC' } }
			}
		} as never);

		await withTransaction((session) => migrationById(MIGRATION_VAT_ARRAY).run(session));

		const migrated = await collections.orders.findOne({ _id });
		expect(migrated?.currencySnapshot).toEqual({
			main: { vat: [{ amount: 100, currency: 'EUR' }] },
			priceReference: { vat: [{ amount: 100, currency: 'EUR' }] },
			secondary: { vat: [{ amount: 0.001, currency: 'BTC' }] }
		});
		expect([migrated?.vat, migrated?.items]).toEqual([vat, items]);
	});
});

const MIGRATION_VAT_REPAIR = '6b05c3cc75b8f6a0ff250099';

describe('migration — Restore VAT rates and lists damaged by the VAT-to-array migration', () => {
	const swissVat = { rate: 8.1, country: 'CH' };
	const reducedVat = { rate: 2.6, country: 'CH' };
	// What the old migration left: the order's lists wrapped in a second list, amounts still in SAT.
	const wrappedVat = (...entries: Array<typeof swissVat>) => [
		entries.map((entry) => ({ ...entry, price: { amount: 810, currency: 'SAT' } }))
	];
	const product = (shipping: boolean) => ({ _id: 'p', name: 'Product', tagIds: [], shipping });

	function repair() {
		return withTransaction((session) => migrationById(MIGRATION_VAT_REPAIR).run(session));
	}

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('restores each item to the only rate of its order, with no word of doubt for a non-shipping item', async () => {
		await cleanDb();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

		const _id = 'order-one-rate';
		await collections.orders.insertOne({
			_id,
			number: 12,
			vat: wrappedVat(swissVat),
			items: [
				{ quantity: 1, product: product(false), vatRate: [8.1] },
				{ quantity: 2, product: product(false), vatRate: [8.1] }
			],
			currencySnapshot: {
				main: { vat: [[{ amount: 100, currency: 'EUR' }]] },
				priceReference: { vat: [[{ amount: 100, currency: 'EUR' }]] },
				secondary: { vat: [[{ amount: 0.001, currency: 'BTC' }]] }
			}
		} as never);

		await repair();

		const migrated = await collections.orders.findOne({ _id });
		expect(migrated?.items.map((item) => item.vatRate)).toEqual([8.1, 8.1]);
		expect(migrated?.vat).toEqual([swissVat]);
		expect(migrated?.currencySnapshot).toEqual({
			main: { vat: [{ amount: 100, currency: 'EUR' }] },
			priceReference: { vat: [{ amount: 100, currency: 'EUR' }] },
			secondary: { vat: [{ amount: 0.001, currency: 'BTC' }] }
		});
		expect(warn.mock.calls).toEqual([]);
	});

	it('lists by number an order whose shipping item may have been VAT-exempt, without its id or buyer', async () => {
		await cleanDb();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

		const _id = 'order-shipping-item';
		await collections.orders.insertOne({
			_id,
			number: 34,
			user: { email: 'buyer@example.com' },
			vat: wrappedVat(swissVat),
			items: [
				{ quantity: 1, product: product(true), vatRate: [8.1] },
				{ quantity: 1, product: product(false), vatRate: [8.1] }
			]
		} as never);

		await repair();

		expect((await collections.orders.findOne({ _id }))?.items.map((item) => item.vatRate)).toEqual([
			8.1, 8.1
		]);
		expect(warn.mock.calls).toEqual([
			[
				"Order number 34: item VAT rate is the order's only rate, check its shipping items for a VAT exemption"
			]
		]);
	});

	it('leaves the item rates of an order with several rates, lists them, and still unwraps its lists', async () => {
		await cleanDb();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

		const _id = 'order-several-rates';
		const pricedItem = {
			quantity: 1,
			product: product(false),
			currencySnapshot: { main: { price: { amount: 5, currency: 'EUR' } } }
		};
		await collections.orders.insertOne({
			_id,
			number: 56,
			status: 'paid',
			createdAt: new Date('2026-09-10T10:00:00Z'),
			vat: wrappedVat(swissVat, reducedVat),
			items: [
				{ ...pricedItem, vatRate: [8.1, 2.6] },
				{ ...pricedItem, vatRate: [8.1, 2.6] }
			],
			payments: [
				{
					_id: new ObjectId(),
					status: 'paid',
					method: 'bank-transfer',
					price: { amount: 10, currency: 'EUR' },
					currencySnapshot: { main: { price: { amount: 10, currency: 'EUR' } } }
				}
			],
			currencySnapshot: {
				main: {
					totalPrice: { amount: 10, currency: 'EUR' },
					vat: [
						[
							{ amount: 1.5, currency: 'EUR' },
							{ amount: 1.24, currency: 'EUR' }
						]
					]
				}
			}
		} as never);

		await repair();

		const migrated = await collections.orders.findOne({ _id });
		expect(migrated?.items.map((item) => item.vatRate)).toEqual([
			[8.1, 2.6],
			[8.1, 2.6]
		]);
		expect(migrated?.vat).toEqual([swissVat, reducedVat]);
		expect(warn.mock.calls).toEqual([
			['Order number 56: item VAT rates could not be restored, set them by hand']
		]);
		// A wrapped list made the VAT total NaN for any period holding the order. This holds without a
		// tag filter only: with one the total reads item.vatRate, so an order left by hand still gives NaN.
		const synthesis = computeReportingSynthesis(
			[migrated as unknown as ReportingOrder],
			parseReportingFilters(new URL('http://x/admin/reporting'), ['bank-transfer']),
			'EUR'
		);
		expect(synthesis.vatTotal).toBe(2.74);
	});

	it('lists an order whose item rate list is empty', async () => {
		await cleanDb();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

		const _id = 'order-empty-rate-list';
		const items = [{ quantity: 1, product: product(false), vatRate: [] }];
		await collections.orders.insertOne({ _id, number: 78, items } as never);

		await repair();

		expect((await collections.orders.findOne({ _id }))?.items).toEqual(items);
		expect(warn.mock.calls).toEqual([
			['Order number 78: item VAT rates could not be restored, set them by hand']
		]);
	});

	it('reads a list repeating one rate as that rate', async () => {
		await cleanDb();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

		const _id = 'order-repeated-rate';
		await collections.orders.insertOne({
			_id,
			number: 90,
			items: [{ quantity: 1, product: product(false), vatRate: [8.1, 8.1] }]
		} as never);

		await repair();

		expect((await collections.orders.findOne({ _id }))?.items[0].vatRate).toBe(8.1);
		expect(warn.mock.calls).toEqual([]);
	});

	it('unwraps a currency snapshot list on its own without a word for a single non-shipping rate', async () => {
		await cleanDb();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

		await collections.orders.insertOne({
			_id: 'order-nested-snapshot-only',
			number: 91,
			vat: [swissVat],
			items: [{ quantity: 1, product: product(false), vatRate: 8.1 }],
			currencySnapshot: { secondary: { vat: [[{ amount: 0.001, currency: 'BTC' }]] } }
		} as never);

		await repair();

		const migrated = await collections.orders.findOne({ _id: 'order-nested-snapshot-only' });
		expect(migrated?.currencySnapshot).toEqual({
			secondary: { vat: [{ amount: 0.001, currency: 'BTC' }] }
		});
		expect(warn.mock.calls).toEqual([]);
	});

	// The earlier repair kept the first rate of each item list and left the wrapped lists alone.
	async function applyEarlierRepair(_id: string) {
		const order = await collections.orders.findOne({ _id });
		const items = order?.items.map((item) => ({
			...item,
			vatRate: Array.isArray(item.vatRate) ? item.vatRate[0] : item.vatRate
		}));
		await collections.orders.updateOne({ _id }, { $set: { items } });
	}

	it('lists by hand an order the earlier repair cut to one rate per item, as its wrapped list still counts several', async () => {
		await cleanDb();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

		const _id = 'order-earlier-repair-several';
		await collections.orders.insertOne({
			_id,
			number: 92,
			vat: wrappedVat(swissVat, reducedVat),
			items: [
				{ quantity: 1, product: product(false), vatRate: [8.1, 2.6] },
				{ quantity: 1, product: product(false), vatRate: [8.1, 2.6] }
			]
		} as never);
		await applyEarlierRepair(_id);

		await repair();

		const migrated = await collections.orders.findOne({ _id });
		expect(migrated?.items.map((item) => item.vatRate)).toEqual([8.1, 8.1]);
		expect(migrated?.vat).toEqual([swissVat, reducedVat]);
		expect(warn.mock.calls).toEqual([
			['Order number 92: item VAT rates could not be restored, set them by hand']
		]);
	});

	it('lists for a check an order with one rate and a shipping item the earlier repair already went over', async () => {
		await cleanDb();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

		const _id = 'order-earlier-repair-one-rate';
		await collections.orders.insertOne({
			_id,
			number: 93,
			vat: wrappedVat(swissVat),
			items: [{ quantity: 1, product: product(true), vatRate: [8.1] }]
		} as never);
		await applyEarlierRepair(_id);

		await repair();

		expect((await collections.orders.findOne({ _id }))?.vat).toEqual([swissVat]);
		expect(warn.mock.calls).toEqual([
			[
				"Order number 93: item VAT rate is the order's only rate, check its shipping items for a VAT exemption"
			]
		]);
	});

	it('changes nothing on a second run or on an order that was never damaged', async () => {
		await cleanDb();

		const healthy = {
			_id: 'order-healthy',
			number: 93,
			vat: [swissVat],
			items: [{ quantity: 1, product: product(false), vatRate: 8.1 }],
			currencySnapshot: { main: { vat: [{ amount: 100, currency: 'EUR' }] } }
		};
		await collections.orders.insertOne(healthy as never);
		await collections.orders.insertOne({
			_id: 'order-damaged',
			number: 94,
			vat: wrappedVat(swissVat),
			items: [{ quantity: 1, product: product(false), vatRate: [8.1] }]
		} as never);

		await repair();
		const afterFirst = await collections.orders.find().sort({ _id: 1 }).toArray();
		await repair();

		expect(await collections.orders.find().sort({ _id: 1 }).toArray()).toEqual(afterFirst);
		expect(await collections.orders.findOne({ _id: 'order-healthy' })).toEqual(healthy);
	});
});
