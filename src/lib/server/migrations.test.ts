import { afterEach, describe, it, expect, vi } from 'vitest';
import { BSON, ObjectId } from 'mongodb';
import { computePriceInfo } from '$lib/cart';
import type { Currency } from '$lib/types/Currency';
import { languages } from '$lib/translations';
import { toCurrency } from '$lib/utils/toCurrency';
import { convertAmountToCurrencyForStorage } from '$lib/utils/toStorageCurrency';
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

const MIGRATION_VAT_REPAIR = '6b05e1289d7ea34515b6ec08';
const VAT_LABEL_ID = 'vat-rate-to-check';

describe('migration — Reconstruct VAT rates and lists damaged by the VAT-to-array migration', () => {
	const PROFILE_RATES = { P1: 8.1, P2: 2.6, P3: 5 };
	type Profile = keyof typeof PROFILE_RATES;
	type Line = {
		id: string;
		price: number;
		qty: number;
		currency?: 'EUR' | 'CHF';
		profile?: Profile;
		ships?: boolean;
		discount?: number;
		free?: number;
		custom?: number;
	};
	type Fees = { amount: number; profile?: Profile; included?: boolean };
	/** The currencies the shop snapshots every order in. */
	type Shop = { main: Currency; priceReference: Currency; secondary?: Currency };
	const EURO_SHOP: Shop = { main: 'EUR', priceReference: 'EUR' };
	type Amount = { amount: number; currency: string };
	type Snapshot = { totalPrice: Amount; shippingPrice?: Amount; vat: Amount[] };

	/**
	 * An order as createOrder stores it: the rates and the VAT amounts come from the real price
	 * computation, the amounts of each currency from the conversions createOrder applies to them.
	 */
	function healthyOrder(
		number: number,
		lines: Line[],
		fees?: Fees,
		customs = false,
		shop: Shop = EURO_SHOP
	) {
		const priceOf = (line: Line) => ({ amount: line.price, currency: line.currency ?? 'EUR' });
		const customPriceOf = (line: Line) =>
			line.custom === undefined
				? undefined
				: { amount: line.custom, currency: line.currency ?? 'EUR' };
		// The delivery fee is priced in the main currency, as createOrder does.
		const feeInMain = fees && {
			amount: toCurrency(shop.main, fees.amount, 'EUR'),
			currency: shop.main
		};
		const info = computePriceInfo(
			lines.map((line) => ({
				product: {
					_id: line.id,
					price: priceOf(line),
					vatProfileId: line.profile,
					shipping: line.ships ?? false
				},
				customPrice: customPriceOf(line),
				quantity: line.qty,
				discountPercentage: line.discount
			})) as never,
			{
				bebopCountry: 'CH',
				deliveryFees: feeInMain ?? { amount: 0, currency: shop.main },
				deliveryFeesVatProfileId: fees?.profile ?? null,
				deliveryFeesVatIncluded: fees?.included ?? false,
				freeProductUnits: Object.fromEntries(lines.map((line) => [line.id, line.free ?? 0])),
				userCountry: customs ? 'FR' : 'CH',
				vatExempted: false,
				vatNullOutsideSellerCountry: customs,
				vatSingleCountry: true,
				vatProfiles: Object.entries(PROFILE_RATES).map(([_id, rate]) => ({
					_id,
					rates: { CH: rate }
				}))
			}
		);
		const keys = Object.entries(shop).filter(([, currency]) => currency) as Array<
			['main' | 'priceReference' | 'secondary', Currency]
		>;
		const snapshots: Record<string, Snapshot> = {};
		for (const [key, currency] of keys) {
			snapshots[key] = {
				totalPrice: {
					amount: toCurrency(currency, info.totalPriceWithVat, info.currency),
					currency
				},
				...(feeInMain && {
					shippingPrice: {
						amount: toCurrency(currency, feeInMain.amount, feeInMain.currency),
						currency
					}
				}),
				vat: info.vat.map((line) => ({
					amount: toCurrency(currency, line.price.amount, line.price.currency),
					currency
				}))
			};
		}
		const totalMain = snapshots.main.totalPrice;
		return {
			_id: `order-${number}`,
			number,
			status: 'paid',
			createdAt: new Date('2026-09-10T10:00:00Z'),
			items: lines.map((line, i) => ({
				_id: new ObjectId(),
				quantity: line.qty,
				discountPercentage: line.discount,
				freeQuantity: info.perItem[i].usedFreeUnits,
				product: {
					_id: line.id,
					name: line.id,
					tagIds: [],
					price: priceOf(line),
					shipping: line.ships ?? false,
					vatProfileId: line.profile
				},
				customPrice: customPriceOf(line),
				vatRate: info.vatRates[i],
				currencySnapshot: Object.fromEntries(
					keys.map(([key, currency]) => [
						key,
						{
							price: convertAmountToCurrencyForStorage(
								currency,
								line.price,
								line.currency ?? 'EUR'
							),
							...(line.custom !== undefined && {
								customPrice: convertAmountToCurrencyForStorage(
									currency,
									line.custom,
									line.currency ?? 'EUR'
								)
							})
						}
					])
				)
			})),
			vat: info.vat.map(({ rate, country }) => ({ rate, country })),
			...(feeInMain && { shippingPrice: feeInMain }),
			payments: [
				{
					_id: new ObjectId(),
					status: 'paid',
					method: 'bank-transfer',
					price: totalMain,
					currencySnapshot: { main: { price: totalMain } }
				}
			],
			currencySnapshot: snapshots
		};
	}
	type HealthyOrder = ReturnType<typeof healthyOrder>;
	const itemRates = (order: HealthyOrder) => order.items.map((item) => item.vatRate);

	/** What the faulty conversion left on an order whose lists were already new: lists in lists, rates as lists. */
	function damaged(order: HealthyOrder) {
		const rates = order.vat.map((line) => line.rate);
		return {
			...order,
			vat: [order.vat.map((line) => ({ ...line, price: { amount: 810, currency: 'SAT' } }))],
			items: order.items.map((item) => ({ ...item, vatRate: rates })),
			currencySnapshot: Object.fromEntries(
				Object.entries(order.currencySnapshot).map(([key, snapshot]) => [
					key,
					{ ...snapshot, vat: [snapshot.vat.map((amount) => ({ ...amount }))] }
				])
			) as Record<string, Omit<Snapshot, 'vat'> & { vat: Amount[][] }>
		};
	}

	/** The earlier repair of this series kept the first rate of each item list and left the lists wrapped. */
	function earlierRepaired(order: HealthyOrder) {
		const wrapped = damaged(order);
		return {
			...wrapped,
			items: wrapped.items.map((item) => ({ ...item, vatRate: item.vatRate[0] }))
		};
	}

	const insert = (...orders: unknown[]) => collections.orders.insertMany(orders as never);
	const stored = (number: number) => collections.orders.findOne({ _id: `order-${number}` });

	function repair() {
		return withTransaction((session) => migrationById(MIGRATION_VAT_REPAIR).run(session));
	}

	afterEach(() => {
		vi.restoreAllMocks();
	});

	const twoRates = (number: number) =>
		healthyOrder(number, [
			{ id: 'a', price: 10, qty: 3, profile: 'P1' },
			{ id: 'b', price: 4.5, qty: 2, profile: 'P2' }
		]);

	it('gives each item its own rate back on an order with two rates, and the reporting VAT total is a number', async () => {
		await cleanDb();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const order = twoRates(1);
		await insert(damaged(order));

		await repair();

		const migrated = await stored(1);
		expect(migrated?.items.map((item) => item.vatRate)).toEqual([8.1, 2.6]);
		expect(migrated?.vat).toEqual(order.vat);
		expect(migrated?.currencySnapshot).toEqual(order.currencySnapshot);
		expect(warn.mock.calls).toEqual([]);
		expect(await collections.labels.countDocuments()).toBe(0);
		expect(migrated?.orderLabelIds).toBeUndefined();
		// A wrapped list made this total NaN.
		const synthesis = computeReportingSynthesis(
			[migrated as unknown as ReportingOrder],
			parseReportingFilters(new URL('http://x/admin/reporting'), ['bank-transfer']),
			'EUR'
		);
		expect(synthesis.vatTotal).toBe(
			Math.round(
				order.currencySnapshot.main.vat.reduce((total, vat) => total + vat.amount, 0) * 100
			) / 100
		);
	});

	it('gives each item its rate back on an order with three rates and a delivery fee including VAT', async () => {
		await cleanDb();
		const order = healthyOrder(
			2,
			[
				{ id: 'a', price: 10, qty: 3, profile: 'P1', ships: true },
				{ id: 'b', price: 4.5, qty: 2, profile: 'P2' },
				{ id: 'c', price: 7.99, qty: 1, profile: 'P3', discount: 10 }
			],
			{ amount: 5.26, profile: 'P2', included: true }
		);
		expect(itemRates(order)).toEqual([8.1, 2.6, 5]);
		await insert(damaged(order));

		await repair();

		expect((await stored(2))?.items.map((item) => item.vatRate)).toEqual([8.1, 2.6, 5]);
	});

	it('gives each item its rate back on an order the earlier repair already cut to the first rate', async () => {
		await cleanDb();
		const order = twoRates(3);
		await insert(earlierRepaired(order));
		// The lines are sorted by rate, so the first rate is the lowest one.
		expect((await stored(3))?.items.map((item) => item.vatRate)).toEqual([2.6, 2.6]);

		await repair();

		const migrated = await stored(3);
		expect(migrated?.items.map((item) => item.vatRate)).toEqual([8.1, 2.6]);
		expect(migrated?.vat).toEqual(order.vat);
	});

	it('gives items of one VAT profile the same rate, and counts free units and discounts', async () => {
		await cleanDb();
		const order = healthyOrder(4, [
			{ id: 'a1', price: 10, qty: 3, profile: 'P1', free: 1 },
			{ id: 'a2', price: 3.33, qty: 4, profile: 'P1', discount: 20 },
			{ id: 'b', price: 9.9, qty: 1, profile: 'P2' }
		]);
		await insert(damaged(order));

		await repair();

		expect((await stored(4))?.items.map((item) => item.vatRate)).toEqual([8.1, 8.1, 2.6]);
	});

	it('finds the exempt shipping item of an order bought from abroad, and keeps the shipping item taxed otherwise', async () => {
		await cleanDb();
		const lines: Line[] = [
			{ id: 'ship', price: 20, qty: 1, profile: 'P1', ships: true },
			{ id: 'digital', price: 10, qty: 1, profile: 'P1' }
		];
		const abroad = healthyOrder(5, lines, { amount: 3 }, true);
		const home = healthyOrder(6, lines, { amount: 3 });
		expect([itemRates(abroad), itemRates(home)]).toEqual([
			[0, 8.1],
			[8.1, 8.1]
		]);
		await insert(damaged(abroad), damaged(home));

		await repair();

		expect((await stored(5))?.items.map((item) => item.vatRate)).toEqual([0, 8.1]);
		expect((await stored(6))?.items.map((item) => item.vatRate)).toEqual([8.1, 8.1]);
	});

	it('does not read the VAT profiles, which may have changed since the order', async () => {
		await cleanDb();
		const order = twoRates(7);
		await insert(damaged(order));
		await collections.vatProfiles.insertMany([
			{ _id: 'P1', name: 'P1', rates: { CH: 20 } },
			{ _id: 'P2', name: 'P2', rates: { CH: 20 } }
		] as never);

		await repair();

		expect((await stored(7))?.items.map((item) => item.vatRate)).toEqual([8.1, 2.6]);
	});

	it('writes no rate when the recorded amounts fit none, lists the order by number and labels it', async () => {
		await cleanDb();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const order = twoRates(8);
		const tampered = damaged(order);
		tampered.currencySnapshot.main.vat[0][0].amount += 0.5;
		await insert({ ...tampered, user: { email: 'buyer@example.com' } });

		await repair();

		const migrated = await stored(8);
		expect(migrated?.items.map((item) => item.vatRate)).toEqual([
			[2.6, 8.1],
			[2.6, 8.1]
		]);
		expect(migrated?.vat).toEqual(order.vat);
		expect(migrated?.orderLabelIds).toEqual([VAT_LABEL_ID]);
		expect(warn.mock.calls).toEqual([
			[
				'Order number 8: item VAT rates could not be reconstructed (no assignment of rates fits the recorded VAT amounts)'
			]
		]);
	});

	it('writes no rate when two item groups could swap their rates, and labels the order', async () => {
		await cleanDb();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const order = healthyOrder(9, [
			{ id: 'a', price: 10, qty: 1, profile: 'P1' },
			{ id: 'b', price: 10, qty: 1, profile: 'P2' }
		]);
		await insert(damaged(order));

		await repair();

		const migrated = await stored(9);
		expect(migrated?.items.map((item) => item.vatRate)).toEqual([
			[2.6, 8.1],
			[2.6, 8.1]
		]);
		expect(migrated?.orderLabelIds).toEqual([VAT_LABEL_ID]);
		expect(warn.mock.calls).toEqual([
			[
				'Order number 9: item VAT rates could not be reconstructed (several assignments of rates fit the recorded VAT amounts)'
			]
		]);
	});

	it('lists an order with no VAT line or no recorded amount, and writes nothing on its items', async () => {
		await cleanDb();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const noLine = { ...damaged(twoRates(10)), vat: [[]] };
		const noAmount = { ...damaged(twoRates(11)), currencySnapshot: {} };
		const emptyRateList = {
			...damaged(twoRates(12)),
			items: damaged(twoRates(12)).items.map((item) => ({ ...item, vatRate: [] })),
			currencySnapshot: {}
		};
		await insert(noLine, noAmount, emptyRateList);

		await repair();

		expect(warn.mock.calls).toEqual([
			[
				'Order number 10: item VAT rates could not be reconstructed (the order has no VAT line with a rate)'
			],
			[
				'Order number 11: item VAT rates could not be reconstructed (the recorded VAT amounts are missing or do not match the VAT lines)'
			],
			[
				'Order number 12: item VAT rates could not be reconstructed (the recorded VAT amounts are missing or do not match the VAT lines)'
			]
		]);
		expect((await stored(12))?.items.map((item) => item.vatRate)).toEqual([[], []]);
		expect(await collections.orders.countDocuments({ orderLabelIds: VAT_LABEL_ID })).toBe(3);
	});

	it('unwraps a currency snapshot list on its own, with no rebuild, no word and no label', async () => {
		await cleanDb();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const order = twoRates(13);
		await insert({
			...order,
			currencySnapshot: {
				...order.currencySnapshot,
				secondary: { vat: [[{ amount: 0.001, currency: 'BTC' }]] }
			}
		});

		await repair();

		const migrated = await stored(13);
		expect(migrated?.currencySnapshot.secondary).toEqual({
			vat: [{ amount: 0.001, currency: 'BTC' }]
		});
		expect(migrated?.items.map((item) => item.vatRate)).toEqual([8.1, 2.6]);
		expect(warn.mock.calls).toEqual([]);
		expect(await collections.labels.countDocuments()).toBe(0);
	});

	it('labels only the orders it cannot reconstruct, once, with a fixed id and the name in every language', async () => {
		await cleanDb();
		vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const unfit = damaged(twoRates(20));
		unfit.currencySnapshot.main.vat[0][0].amount += 0.5;
		const swappable = damaged(
			healthyOrder(21, [
				{ id: 'a', price: 10, qty: 1, profile: 'P1' },
				{ id: 'b', price: 10, qty: 1, profile: 'P2' }
			])
		);
		await insert(
			damaged(twoRates(22)),
			earlierRepaired(twoRates(23)),
			twoRates(24),
			unfit,
			swappable
		);

		await repair();

		expect(
			(
				await collections.orders.find({ orderLabelIds: VAT_LABEL_ID }).sort({ number: 1 }).toArray()
			).map((order) => order.number)
		).toEqual([20, 21]);
		const labels = await collections.labels.find().toArray();
		expect(labels).toHaveLength(1);
		expect(labels[0]).toMatchObject({
			_id: VAT_LABEL_ID,
			name: languages.en.admin.label.vatRateToCheck,
			color: '#ea580c',
			icon: '🧾'
		});
		expect(labels[0].translations).toEqual(
			Object.fromEntries(
				Object.entries(languages).map(([language, text]) => [
					language,
					{ name: text.admin.label.vatRateToCheck }
				])
			)
		);
		expect(Object.keys(labels[0].translations ?? {}).sort()).toEqual([
			'de',
			'en',
			'es-sv',
			'fr',
			'it',
			'nl',
			'pt'
		]);
	});

	it('keeps a label the shop already holds under that id', async () => {
		await cleanDb();
		vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		await collections.labels.insertOne({
			_id: VAT_LABEL_ID,
			name: 'My own name',
			color: '#000000',
			icon: 'x',
			createdAt: new Date(0),
			updatedAt: new Date(0)
		});
		const unfit = damaged(twoRates(25));
		unfit.currencySnapshot.main.vat[0][0].amount += 0.5;
		await insert(unfit);

		await repair();

		expect((await collections.labels.findOne({ _id: VAT_LABEL_ID }))?.name).toBe('My own name');
		expect((await stored(25))?.orderLabelIds).toEqual([VAT_LABEL_ID]);
	});

	it('leaves healthy orders byte for byte as they were, and a second run changes nothing', async () => {
		await cleanDb();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const healthy = [
			twoRates(30),
			healthyOrder(31, [{ id: 'a', price: 10, qty: 2, profile: 'P1' }]),
			healthyOrder(32, [{ id: 'a', price: 5, qty: 1, ships: true }], { amount: 4 })
		];
		const unfit = damaged(twoRates(33));
		unfit.currencySnapshot.main.vat[0][0].amount += 0.5;
		await insert(...healthy, damaged(twoRates(34)), unfit);
		const bytes = async () =>
			(
				await collections.orders
					.find({ number: { $lt: 33 } })
					.sort({ number: 1 })
					.toArray()
			).map((order) => Buffer.from(BSON.serialize(order)).toString('base64'));
		const before = await bytes();
		expect(before).toHaveLength(3);

		await repair();
		const afterFirst = await collections.orders.find().sort({ number: 1 }).toArray();
		expect(warn).toHaveBeenCalledTimes(1);
		await repair();

		expect(await bytes()).toEqual(before);
		expect(await collections.orders.find().sort({ number: 1 }).toArray()).toEqual(afterFirst);
		expect((await stored(33))?.orderLabelIds).toEqual([VAT_LABEL_ID]);
		expect(await collections.labels.countDocuments()).toBe(1);
		// The order labelled by the first run is neither rewritten nor listed again.
		expect(warn).toHaveBeenCalledTimes(1);
	});

	/** The order keeps its true rates, or none is written and the order is labelled: never another rate. */
	async function expectTrueOrLabelled(number: number, truth: number[]) {
		const order = await stored(number);
		const written = order?.items.map((item) => item.vatRate);
		if (written?.every((rate) => typeof rate === 'number')) {
			expect(written).toEqual(truth);
			expect(order?.orderLabelIds).toBeUndefined();
		} else {
			expect(order?.orderLabelIds).toEqual([VAT_LABEL_ID]);
		}
		return written?.every((rate) => typeof rate === 'number');
	}

	const SAT_SHOP: Shop = { main: 'SAT', priceReference: 'EUR', secondary: 'BTC' };

	it('rebuilds the rates of an order recorded in satoshis, euros and bitcoin, with items priced in two currencies', async () => {
		await cleanDb();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const order = healthyOrder(
			40,
			[
				{ id: 'a', price: 19.9, qty: 2, profile: 'P1' },
				{ id: 'b', price: 12.5, currency: 'CHF', qty: 1, profile: 'P2' },
				{ id: 'c', price: 123.45, qty: 1, profile: 'P3', ships: true }
			],
			{ amount: 4.9, profile: 'P2' },
			false,
			SAT_SHOP
		);
		expect(itemRates(order)).toEqual([8.1, 2.6, 5]);
		await insert(damaged(order));

		await repair();

		expect((await stored(40))?.items.map((item) => item.vatRate)).toEqual([8.1, 2.6, 5]);
		expect((await stored(40))?.currencySnapshot).toEqual(order.currencySnapshot);
		expect(warn.mock.calls).toEqual([]);
	});

	it('never swaps two rates the amounts cannot tell apart in satoshis, however close the prices are', async () => {
		await cleanDb();
		vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const order = healthyOrder(
			41,
			[
				{ id: 'a', price: 9.99, qty: 1, profile: 'P1' },
				{ id: 'b', price: 10, qty: 1, profile: 'P2' }
			],
			undefined,
			false,
			SAT_SHOP
		);
		await insert(damaged(order));

		await repair();

		expect(await expectTrueOrLabelled(41, itemRates(order) as number[])).toBe(false);
	});

	it('rebuilds the rates when the delivery fee includes VAT, which no other fee mode explains', async () => {
		await cleanDb();
		vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const order = healthyOrder(42, [{ id: 'a', price: 20, qty: 1, profile: 'P2' }], {
			amount: 100,
			profile: 'P1',
			included: true
		});
		expect(order.vat.map((line) => line.rate)).toEqual([2.6, 8.1]);
		await insert(damaged(order));

		await repair();

		expect((await stored(42))?.items.map((item) => item.vatRate)).toEqual([2.6]);
	});

	it('groups items by VAT profile: two items of one profile settle the rate that one amount could not', async () => {
		await cleanDb();
		vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		// Taken one by one, the 6 of the second profile could stand for the 6 of the first profile.
		const order = healthyOrder(43, [
			{ id: 'a1', price: 4, qty: 1, profile: 'P1' },
			{ id: 'a2', price: 6, qty: 1, profile: 'P1' },
			{ id: 'b', price: 6, qty: 1, profile: 'P2' }
		]);
		await insert(damaged(order));

		await repair();

		expect((await stored(43))?.items.map((item) => item.vatRate)).toEqual([8.1, 8.1, 2.6]);
	});

	it('bills an item at its custom price, not at the price of its product', async () => {
		await cleanDb();
		const order = healthyOrder(44, [
			{ id: 'a', price: 10, custom: 3, qty: 2, profile: 'P1' },
			{ id: 'b', price: 9, qty: 1, profile: 'P2' }
		]);
		await insert(damaged(order));

		await repair();

		expect((await stored(44))?.items.map((item) => item.vatRate)).toEqual([8.1, 2.6]);
	});

	it('does not take an amount rounded item by item for a sign of the other rates', async () => {
		await cleanDb();
		vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		// Before the cart summed VAT unrounded, each item's VAT was rounded alone: 4 x 0.14, not 0.58.
		const order = healthyOrder(45, [
			...[1, 2, 3, 4].map((n) => ({ id: `a${n}`, price: 1.79, qty: 1, profile: 'P1' as const })),
			{ id: 'b', price: 6.9, qty: 1, profile: 'P2' }
		]);
		expect(itemRates(order)).toEqual([8.1, 8.1, 8.1, 8.1, 2.6]);
		const perItem = damaged(order);
		for (const snapshot of Object.values(perItem.currencySnapshot)) {
			snapshot.vat = [
				[
					{ amount: 0.18, currency: 'EUR' },
					{ amount: 0.56, currency: 'EUR' }
				]
			];
		}
		await insert(perItem);

		await repair();

		expect(await expectTrueOrLabelled(45, [8.1, 8.1, 8.1, 8.1, 2.6])).toBe(false);
	});

	it('labels an order whose item has no VAT of its own to tell its rate by', async () => {
		await cleanDb();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		// A free download at one rate and a parcel at another: the line of the free one rounded to nothing.
		const order = healthyOrder(46, [
			{ id: 'download', price: 0, qty: 1, profile: 'P1' },
			{ id: 'parcel', price: 50, qty: 1, profile: 'P3', ships: true }
		]);
		expect(order.vat.map((line) => line.rate)).toEqual([5, 8.1]);
		const withoutZeroLine = damaged({
			...order,
			vat: order.vat.filter((line) => line.rate === 5),
			currencySnapshot: Object.fromEntries(
				Object.entries(order.currencySnapshot).map(([key, snapshot]) => [
					key,
					{ ...snapshot, vat: snapshot.vat.slice(0, 1) }
				])
			)
		});
		await insert(withoutZeroLine);

		await repair();

		expect(await expectTrueOrLabelled(46, [8.1, 5])).toBe(false);
		expect(warn.mock.calls).toEqual([
			[
				'Order number 46: item VAT rates could not be reconstructed (an item group has too small a VAT amount to tell its rate by)'
			]
		]);
	});

	it('labels an order whose smallest item is lost in the rounding of a satoshi shop', async () => {
		await cleanDb();
		vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const order = healthyOrder(
			47,
			[
				{ id: 'tiny', price: 0.07, currency: 'CHF', qty: 1, profile: 'P1', ships: true },
				{ id: 'big', price: 50, qty: 1, profile: 'P2' }
			],
			undefined,
			false,
			SAT_SHOP
		);
		await insert(damaged(order));

		await repair();

		await expectTrueOrLabelled(47, itemRates(order) as number[]);
	});

	describe('names the reason an order cannot be reconstructed', () => {
		const reasons: Array<[string, string, (order: ReturnType<typeof damaged>) => unknown]> = [
			['the order has no VAT line with a rate', 'no line', (order) => ({ ...order, vat: [[]] })],
			[
				'two VAT lines share a rate',
				'a shared rate',
				(order) => ({ ...order, vat: [order.vat[0].map((line) => ({ ...line, rate: 8.1 }))] })
			],
			[
				'the recorded VAT amounts are missing or do not match the VAT lines',
				'no amount',
				(order) => ({ ...order, currencySnapshot: {} })
			],
			[
				'the order has a booking item',
				'a booking',
				(order) => ({ ...order, items: [{ ...order.items[0], booking: {} }, order.items[1]] })
			],
			['the order has no item', 'no item', (order) => ({ ...order, items: [] })],
			[
				'the VAT amounts are in an unknown currency',
				'an unknown currency',
				(order) => ({
					...order,
					currencySnapshot: {
						main: {
							...order.currencySnapshot.main,
							vat: [
								order.currencySnapshot.main.vat[0].map((amount) => ({ ...amount, currency: 'XXX' }))
							]
						}
					}
				})
			],
			[
				'an item has no recorded price in the currency of the VAT amounts',
				'no item price',
				(order) => ({
					...order,
					items: [{ ...order.items[0], currencySnapshot: {} }, order.items[1]]
				})
			],
			[
				'the delivery fee is not in the currency of the VAT amounts',
				'a fee in another currency',
				(order) => ({
					...order,
					currencySnapshot: {
						main: { ...order.currencySnapshot.main, shippingPrice: { amount: 5, currency: 'USD' } }
					}
				})
			],
			[
				'no assignment of rates fits the recorded VAT amounts',
				'amounts that fit nothing',
				(order) => ({
					...order,
					currencySnapshot: {
						main: {
							...order.currencySnapshot.main,
							vat: [order.currencySnapshot.main.vat[0].map((amount) => ({ ...amount, amount: 99 }))]
						}
					}
				})
			]
		];

		it.each(reasons.map(([reason, label, mutate]) => ({ reason, label, mutate })))(
			'names $label',
			async ({ reason, mutate }) => {
				await cleanDb();
				const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
				await insert(mutate(damaged(twoRates(50))));

				await repair();

				expect(warn.mock.calls).toEqual([
					[`Order number 50: item VAT rates could not be reconstructed (${reason})`]
				]);
				expect((await stored(50))?.orderLabelIds).toEqual([VAT_LABEL_ID]);
			}
		);

		it('too many item groups to try every assignment', async () => {
			await cleanDb();
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
			const lines = [2.1, 5.5, 10];
			const amount = { amount: 1, currency: 'EUR' };
			const price = { amount: 10, currency: 'EUR' };
			await insert({
				_id: 'order-51',
				number: 51,
				vat: [lines.map((rate) => ({ rate, country: 'FR' }))],
				items: Array.from({ length: 8 }, (_, group) => ({
					quantity: 1,
					vatRate: lines,
					product: { _id: `g${group}`, shipping: true, vatProfileId: `g${group}`, price },
					currencySnapshot: { main: { price } }
				})),
				currencySnapshot: { main: { vat: [lines.map(() => amount)] } }
			});

			await repair();

			expect(warn.mock.calls).toEqual([
				[
					'Order number 51: item VAT rates could not be reconstructed (too many item groups to try every assignment)'
				]
			]);
		});
	});

	it('never writes a wrong rate on randomly built orders, in any shop currency, and rebuilds most of them', async () => {
		await cleanDb();
		vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		let seed = 2677;
		const random = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
		const pick = <T>(list: T[]): T => list[Math.floor(random() * list.length)];
		const shops: Shop[] = [
			EURO_SHOP,
			SAT_SHOP,
			{ main: 'CHF', priceReference: 'EUR', secondary: 'USD' }
		];
		const truths = new Map<number, number[]>();
		const orders = [];
		for (let number = 100; number < 260; number++) {
			const lines: Line[] = Array.from({ length: 1 + Math.floor(random() * 4) }, (_, i) => ({
				id: `r${number}-${i}`,
				price: pick([0.07, 1, 2.5, 3.33, 9.99, 10, 19.9, 123.45, 1000]),
				qty: pick([1, 1, 2, 3, 7]),
				currency: pick(['EUR', 'EUR', 'CHF']),
				profile: pick([undefined, 'P1', 'P2', 'P3']),
				ships: pick([true, false]),
				discount: random() < 0.2 ? pick([10, 25, 50]) : undefined,
				free: random() < 0.1 ? 1 : 0
			}));
			const fees =
				random() < 0.5
					? {
							amount: pick([4.9, 5, 9.99, 12.5]),
							profile: pick([undefined, 'P2' as const]),
							included: pick([true, false])
					  }
					: undefined;
			const order = healthyOrder(number, lines, fees, random() < 0.2, pick(shops));
			if (order.vat.length) {
				truths.set(number, itemRates(order) as number[]);
				orders.push(damaged(order));
			}
		}
		await insert(...orders);

		await repair();

		const outcomes = { rebuilt: 0, labelled: 0 };
		for (const [number, truth] of truths) {
			outcomes[(await expectTrueOrLabelled(number, truth)) ? 'rebuilt' : 'labelled']++;
		}
		expect(outcomes.rebuilt).toBeGreaterThan(truths.size * 0.6);
		expect(outcomes.rebuilt + outcomes.labelled).toBe(truths.size);
	});
});
