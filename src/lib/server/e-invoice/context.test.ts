import { describe, it, expect } from 'vitest';
import { ObjectId } from 'mongodb';
import type { Order, OrderPayment } from '$lib/types/Order';
import type { SellerIdentity } from '$lib/types/SellerIdentity';
import { buildInvoiceContext, pickInvoiceCurrencyRole } from './context';

// Minimal order/payment fixtures carrying only what the mapper reads.
// Scenario: main in BTC, accounting in EUR (the invoice currency), one 20%-VAT
// item — paid in SAT.

function makeSeller(): SellerIdentity {
	return {
		businessName: 'ACME SAS',
		vatNumber: 'FR12345678901',
		address: { street: '1 rue de la Paix', zip: '75002', city: 'Paris', country: 'FR' },
		contact: { email: 'acme@example.com' },
		legal: { siret: '12345678900011', legalForm: 'SAS' }
	};
}

function makePayment(over?: Partial<OrderPayment>): OrderPayment {
	return {
		_id: new ObjectId(),
		status: 'paid',
		method: 'lightning',
		price: { amount: 123456, currency: 'SAT' },
		received: { amount: 123456, currency: 'SAT' },
		paidAt: new Date('2026-07-01T10:00:00Z'),
		invoice: { number: 42, createdAt: new Date('2026-07-01T10:00:00Z') },
		currencySnapshot: {
			main: {
				price: { amount: 0.00123456, currency: 'BTC' }
			},
			priceReference: {
				price: { amount: 123456, currency: 'SAT' }
			},
			accounting: {
				price: { amount: 80.25, currency: 'EUR' },
				previouslyPaid: { amount: 0, currency: 'EUR' },
				remainingToPay: { amount: 39.75, currency: 'EUR' }
			}
		},
		...over
	} as OrderPayment;
}

function makeOrder(over?: Partial<Order>): Order {
	return {
		_id: 'order-uuid',
		number: 7,
		locale: 'en',
		createdAt: new Date('2026-07-01T09:00:00Z'),
		updatedAt: new Date('2026-07-01T09:00:00Z'),
		items: [
			{
				product: { name: 'T-shirt' },
				quantity: 2,
				vatRate: 20,
				currencySnapshot: {
					main: { price: { amount: 0.0007716, currency: 'BTC' } },
					priceReference: { price: { amount: 77160, currency: 'SAT' } },
					accounting: { price: { amount: 50, currency: 'EUR' } }
				}
			}
		],
		vat: [{ rate: 20, country: 'FR' }],
		currencySnapshot: {
			main: {
				totalPrice: { amount: 0.00184632, currency: 'BTC' },
				vat: [{ amount: 0.00030772, currency: 'BTC' }]
			},
			priceReference: {
				totalPrice: { amount: 184632, currency: 'SAT' },
				vat: [{ amount: 30772, currency: 'SAT' }]
			},
			accounting: {
				totalPrice: { amount: 120, currency: 'EUR' },
				vat: [{ amount: 20, currency: 'EUR' }]
			}
		},
		status: 'paid',
		payments: [],
		sellerIdentity: null,
		billingAddress: {
			firstName: 'Jane',
			lastName: 'Doe',
			address: '2 avenue des Champs',
			city: 'Lyon',
			zip: '69000',
			country: 'FR'
		},
		notifications: { paymentStatus: { email: 'jane@example.com' } },
		user: { email: 'jane@example.com' },
		...over
	} as unknown as Order;
}

describe('pickInvoiceCurrencyRole', () => {
	it('prefers the accounting snapshot when fiat', () => {
		expect(pickInvoiceCurrencyRole(makeOrder())).toBe('accounting');
	});

	it('falls back to secondary then main', () => {
		const order = makeOrder();
		delete (order.currencySnapshot as { accounting?: unknown }).accounting;
		(order.currencySnapshot as { secondary?: unknown }).secondary = {
			totalPrice: { amount: 110, currency: 'CHF' }
		};
		expect(pickInvoiceCurrencyRole(order)).toBe('secondary');
	});

	it('throws when only crypto roles are configured', () => {
		const order = makeOrder();
		delete (order.currencySnapshot as { accounting?: unknown }).accounting;
		expect(() => pickInvoiceCurrencyRole(order)).toThrow(/fiat/);
	});
});

describe('buildInvoiceContext', () => {
	it('computes totals, lines and VAT breakdown in the fiat invoice currency', () => {
		const ctx = buildInvoiceContext({
			order: makeOrder(),
			payment: makePayment(),
			seller: makeSeller(),
			country: 'FR'
		});

		expect(ctx.currency).toBe('EUR');
		expect(ctx.invoiceNumber).toBe(42);
		expect(ctx.lines).toEqual([
			{ name: 'T-shirt', quantity: 2, unitPrice: 50, netAmount: 100, vatRate: 20 }
		]);
		expect(ctx.totals).toMatchObject({ lineNet: 100, exclVat: 100, vat: 20, inclVat: 120 });
		expect(ctx.vatBreakdown).toEqual([
			{ rate: 20, country: 'FR', amount: 20, base: 100, category: 'S' }
		]);
		expect(ctx.discount).toBe(0);
		expect(ctx.rounding).toBe(0);
		expect(ctx.seller.siren).toBe('123456789');
		expect(ctx.buyer.name).toBe('Jane Doe');
	});

	it('computes prepaid/due from the payment snapshot (partial payment)', () => {
		const ctx = buildInvoiceContext({
			order: makeOrder(),
			payment: makePayment(),
			seller: makeSeller(),
			country: 'FR'
		});

		expect(ctx.totals.prepaid).toBe(80.25);
		expect(ctx.totals.due).toBe(39.75);
	});

	it('normalizes SAT payments to BTC with a per-BTC rate', () => {
		const ctx = buildInvoiceContext({
			order: makeOrder(),
			payment: makePayment(),
			seller: makeSeller(),
			country: 'FR'
		});

		expect(ctx.paidWith.amount).toEqual({ amount: 123456, currency: 'SAT' });
		expect(ctx.paidWith.display).toEqual({ amount: 0.00123456, currency: 'BTC' });
		expect(ctx.paidWith.fiatEquivalent).toEqual({ amount: 80.25, currency: 'EUR' });
		expect(ctx.paidWith.rate?.base).toBe('BTC');
		expect(ctx.paidWith.rate?.quote).toBe('EUR');
		expect(ctx.paidWith.rate?.amount).toBeCloseTo(80.25 / 0.00123456, 2);
	});

	it('keeps the rate for fiat payments in another currency', () => {
		const payment = makePayment({
			method: 'card',
			price: { amount: 130, currency: 'CHF' },
			received: { amount: 130, currency: 'CHF' }
		});
		const ctx = buildInvoiceContext({
			order: makeOrder(),
			payment,
			seller: makeSeller(),
			country: 'FR'
		});

		expect(ctx.paidWith.display).toEqual({ amount: 130, currency: 'CHF' });
		expect(ctx.paidWith.rate?.base).toBe('CHF');
		expect(ctx.paidWith.rate?.amount).toBeCloseTo(80.25 / 130, 6);
	});

	it('omits the rate for methods whose currency is an unverified bookkeeping conversion', () => {
		// A 'custom' payment labeled "Ethereum": price/received are stored in the
		// shop's mainCurrency (BTC) purely for internal bookkeeping — that is NOT
		// proof the buyer actually paid in BTC, so no "Paid with BTC" claim.
		const payment = makePayment({
			method: 'custom',
			customPaymentMethod: { id: 'eth', label: 'Ethereum', instructions: '' },
			price: { amount: 0.00006, currency: 'BTC' },
			received: { amount: 0.00006, currency: 'BTC' }
		});
		const ctx = buildInvoiceContext({
			order: makeOrder(),
			payment,
			seller: makeSeller(),
			country: 'FR'
		});

		expect(ctx.paidWith.method).toBe('custom');
		expect(ctx.paidWith.methodLabel).toBe('Ethereum');
		expect(ctx.paidWith.rate).toBeUndefined();
	});

	it.each(['point-of-sale', 'free', 'bank-transfer'] as const)(
		'omits the rate for %s payments even when currency differs from the invoice',
		(method) => {
			const payment = makePayment({
				method,
				price: { amount: 0.00006, currency: 'BTC' },
				received: { amount: 0.00006, currency: 'BTC' }
			});
			const ctx = buildInvoiceContext({
				order: makeOrder(),
				payment,
				seller: makeSeller(),
				country: 'FR'
			});

			expect(ctx.paidWith.rate).toBeUndefined();
		}
	);

	it('omits the rate when the payment is in the invoice currency', () => {
		const payment = makePayment({
			method: 'card',
			price: { amount: 120, currency: 'EUR' },
			received: { amount: 120, currency: 'EUR' }
		});
		const ctx = buildInvoiceContext({
			order: makeOrder(),
			payment,
			seller: makeSeller(),
			country: 'FR'
		});

		expect(ctx.paidWith.rate).toBeUndefined();
	});

	it('omits the rate for zero received amounts (free payment)', () => {
		const payment = makePayment({
			method: 'free',
			price: { amount: 0, currency: 'SAT' },
			received: { amount: 0, currency: 'SAT' }
		});
		const ctx = buildInvoiceContext({
			order: makeOrder(),
			payment,
			seller: makeSeller(),
			country: 'FR'
		});

		expect(ctx.paidWith.rate).toBeUndefined();
	});

	it('reports a real order discount as `discount`, not `rounding`', () => {
		const order = makeOrder();
		// 120 EUR of items but 20 EUR order discount: total 100 incl. VAT
		order.currencySnapshot.accounting = {
			totalPrice: { amount: 100, currency: 'EUR' },
			vat: [{ amount: 20, currency: 'EUR' }],
			discount: { amount: 20, currency: 'EUR' }
		};
		const ctx = buildInvoiceContext({
			order,
			payment: makePayment(),
			seller: makeSeller(),
			country: 'FR'
		});

		// VAT scaled by the discount share: 20 * (1 - 20/120) = 16.67
		expect(ctx.totals.vat).toBeCloseTo(16.67, 2);
		expect(ctx.totals.exclVat).toBeCloseTo(83.33, 2);
		// lineNet (100) + shipping (0) - exclVat = the excl-VAT discount amount
		// (order.discount itself is incl-VAT, so it can't be subtracted directly)
		expect(ctx.discount).toBeCloseTo(16.67, 2);
		expect(ctx.rounding).toBe(0);
		expect(ctx.totals.inclVat).toBe(100);
	});

	it('never labels pure rounding drift as a discount (no order.discount present)', () => {
		// Regression: a precise 8-decimal base price (2.8279) rounds to 2.83 at
		// line level, but the order snapshot's independently-rounded
		// totalPrice(3.39) - vat(0.57) yields 2.82 excl. VAT — a 1-cent gap with
		// no relation to any actual discount (order.discount is absent here).
		const order = makeOrder({
			items: [
				{
					product: { name: 'Book' },
					quantity: 1,
					vatRate: 20,
					currencySnapshot: {
						main: { price: { amount: 0.00005, currency: 'BTC' } },
						priceReference: { price: { amount: 5000, currency: 'SAT' } },
						accounting: { price: { amount: 2.8279, currency: 'EUR' } }
					}
				}
			],
			vat: [{ rate: 20, country: 'FR' }]
		} as unknown as Partial<Order>);
		order.currencySnapshot.accounting = {
			totalPrice: { amount: 3.39, currency: 'EUR' },
			vat: [{ amount: 0.57, currency: 'EUR' }]
		};

		const ctx = buildInvoiceContext({
			order,
			payment: makePayment(),
			seller: makeSeller(),
			country: 'FR'
		});

		expect(ctx.lines[0].netAmount).toBe(2.83);
		expect(ctx.totals.exclVat).toBe(2.82);
		expect(ctx.discount).toBe(0);
		expect(ctx.rounding).toBeCloseTo(0.01, 2);
	});

	it('reports a VAT exemption as category E with the reason', () => {
		const order = makeOrder({
			vat: [],
			vatFree: { reason: 'TVA non applicable, art. 293 B du CGI' }
		} as Partial<Order>);
		order.currencySnapshot.accounting = {
			totalPrice: { amount: 100, currency: 'EUR' }
		};
		order.items[0].vatRate = 0;
		order.items[0].currencySnapshot.accounting = { price: { amount: 50, currency: 'EUR' } };
		const ctx = buildInvoiceContext({
			order,
			payment: makePayment(),
			seller: makeSeller(),
			country: 'FR'
		});

		expect(ctx.vatBreakdown).toEqual([
			{
				rate: 0,
				country: 'FR',
				amount: 0,
				base: 100,
				category: 'E',
				exemptionReason: 'TVA non applicable, art. 293 B du CGI'
			}
		]);
	});

	it('carries the buyer company identifiers (B2B: company name, VAT, SIREN)', () => {
		const order = makeOrder();
		order.billingAddress = {
			...(order.billingAddress ?? ({} as NonNullable<Order['billingAddress']>)),
			isCompany: true,
			companyName: 'Client SARL',
			vatNumber: 'FR98765432109',
			siren: '987654321'
		};
		const ctx = buildInvoiceContext({
			order,
			payment: makePayment(),
			seller: makeSeller(),
			country: 'FR'
		});

		expect(ctx.buyer).toMatchObject({
			name: 'Client SARL',
			isCompany: true,
			vatNumber: 'FR98765432109',
			siren: '987654321'
		});
	});

	it('throws when the payment has no invoice number', () => {
		const payment = makePayment({ invoice: undefined });
		expect(() =>
			buildInvoiceContext({ order: makeOrder(), payment, seller: makeSeller(), country: 'FR' })
		).toThrow(/invoice number/);
	});

	it('throws for France when the seller has no SIRET (BR-FR-10)', () => {
		const seller = { ...makeSeller(), legal: undefined };
		expect(() =>
			buildInvoiceContext({ order: makeOrder(), payment: makePayment(), seller, country: 'FR' })
		).toThrow(/SIRET/);
	});

	it('derives operation nature from Product.shipping', () => {
		const goods = buildInvoiceContext({
			order: makeOrder(),
			payment: makePayment(),
			seller: makeSeller(),
			country: 'FR'
		});
		expect(goods.operationNature).toBe('services'); // fixture product has no `shipping` flag

		const order = makeOrder();
		order.items[0].product.shipping = true;
		const ctx = buildInvoiceContext({
			order,
			payment: makePayment(),
			seller: makeSeller(),
			country: 'FR'
		});
		expect(ctx.operationNature).toBe('goods');
	});

	it('derives transaction category from seller vs buyer country', () => {
		const domestic = buildInvoiceContext({
			order: makeOrder(),
			payment: makePayment(),
			seller: makeSeller(),
			country: 'FR'
		});
		expect(domestic.transactionCategory).toBe('domestic');

		const intraEU = makeOrder();
		intraEU.billingAddress = {
			...intraEU.billingAddress,
			country: 'DE'
		} as Order['billingAddress'];
		expect(
			buildInvoiceContext({
				order: intraEU,
				payment: makePayment(),
				seller: makeSeller(),
				country: 'FR'
			}).transactionCategory
		).toBe('intraEU');

		const exportOrder = makeOrder();
		exportOrder.billingAddress = {
			...exportOrder.billingAddress,
			country: 'US'
		} as Order['billingAddress'];
		expect(
			buildInvoiceContext({
				order: exportOrder,
				payment: makePayment(),
				seller: makeSeller(),
				country: 'FR'
			}).transactionCategory
		).toBe('export');
	});
});
