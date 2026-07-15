import { describe, it, expect } from 'vitest';
import type { InvoiceContext } from './context';
import { billingModeCode, ciiXml, paidWithNote, paymentMeansTypeCode } from './cii';

function makeContext(over?: Partial<InvoiceContext>): InvoiceContext {
	return {
		country: 'FR',
		invoiceNumber: 42,
		issueDate: new Date('2026-07-01T10:00:00Z'),
		orderNumber: 7,
		orderCreatedAt: new Date('2026-07-01T09:00:00Z'),
		locale: 'en',
		currency: 'EUR',
		operationNature: 'goods',
		transactionCategory: 'domestic',
		seller: {
			name: 'ACME SAS',
			isCompany: true,
			vatNumber: 'FR12345678901',
			siren: '123456789',
			siret: '12345678900011',
			address: { street: '1 rue de la Paix', zip: '75002', city: 'Paris', country: 'FR' },
			email: 'acme@example.com'
		},
		buyer: {
			name: 'Jane & John <Doe>',
			address: { street: '2 avenue des Champs', zip: '69000', city: 'Lyon', country: 'FR' },
			email: 'jane@example.com'
		},
		lines: [{ name: 'T-shirt', quantity: 2, unitPrice: 50, netAmount: 100, vatRate: 20 }],
		discount: 0,
		rounding: 0,
		vatBreakdown: [{ rate: 20, country: 'FR', amount: 20, base: 100, category: 'S' }],
		totals: { lineNet: 100, exclVat: 100, vat: 20, inclVat: 120, prepaid: 80.25, due: 39.75 },
		paidWith: {
			method: 'lightning',
			paidAt: new Date('2026-07-01T10:00:00Z'),
			amount: { amount: 123456, currency: 'SAT' },
			display: { amount: 0.00123456, currency: 'BTC' },
			fiatEquivalent: { amount: 80.25, currency: 'EUR' },
			rate: { base: 'BTC', quote: 'EUR', amount: 65003.08 }
		},
		...over
	};
}

describe('ciiXml', () => {
	it('produces the expected EN16931 CII document (golden)', () => {
		expect(ciiXml(makeContext())).toMatchSnapshot();
	});

	it('escapes XML special characters in names', () => {
		const xml = ciiXml(makeContext());
		expect(xml).toContain('Jane &amp; John &lt;Doe&gt;');
		expect(xml).not.toContain('<Doe>');
	});

	it('formats amounts with 2 decimals and carries BT-113/BT-115', () => {
		const xml = ciiXml(makeContext());
		expect(xml).toContain('<ram:TaxBasisTotalAmount>100.00</ram:TaxBasisTotalAmount>');
		expect(xml).toContain('<ram:GrandTotalAmount>120.00</ram:GrandTotalAmount>');
		expect(xml).toContain('<ram:TotalPrepaidAmount>80.25</ram:TotalPrepaidAmount>');
		expect(xml).toContain('<ram:DuePayableAmount>39.75</ram:DuePayableAmount>');
	});

	it('keeps the invoice currency fiat and puts the crypto payment in a BT-22 note', () => {
		const xml = ciiXml(makeContext());
		expect(xml).toContain('<ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>');
		expect(xml).not.toContain('<ram:InvoiceCurrencyCode>BTC');
		expect(xml).toContain('<ram:IncludedNote>');
		expect(xml).toContain('Paid with BTC: 0.00123456 BTC (80.25 EUR)');
		expect(xml).toContain('1 BTC = 65003.08 EUR (rate at payment time)');
	});

	it('omits the crypto payment note for same-currency payments (French mandatory notes still present)', () => {
		const ctx = makeContext();
		delete ctx.paidWith.rate;
		const xml = ciiXml(ctx);
		expect(xml).not.toContain('Paid with');
		expect(xml).toContain('<ram:SubjectCode>PMT</ram:SubjectCode>');
	});

	it('adds the mandatory French legal mention notes (BR-FR-05)', () => {
		const xml = ciiXml(makeContext());
		expect(xml).toContain('<ram:SubjectCode>PMT</ram:SubjectCode>');
		expect(xml).toContain('<ram:SubjectCode>PMD</ram:SubjectCode>');
		expect(xml).toContain('<ram:SubjectCode>AAB</ram:SubjectCode>');
	});

	it('carries a non-empty ApplicableHeaderTradeDelivery (BR against empty elements)', () => {
		const xml = ciiXml(makeContext());
		expect(xml).not.toContain('<ram:ApplicableHeaderTradeDelivery/>');
		expect(xml).toContain('<ram:ApplicableHeaderTradeDelivery>');
		expect(xml).toContain('<ram:ActualDeliverySupplyChainEvent>');
	});

	it('sets the French billing-mode code (BT-23, BR-FR-08)', () => {
		const xml = ciiXml(makeContext({ operationNature: 'goods', transactionCategory: 'domestic' }));
		expect(xml).toContain('<ram:BusinessProcessSpecifiedDocumentContextParameter>');
		expect(xml).toContain('<ram:ID>B1</ram:ID>');
	});

	it('serializes the seller legal registration (SIREN, scheme 0002)', () => {
		expect(ciiXml(makeContext())).toContain('<ram:ID schemeID="0002">123456789</ram:ID>');
	});

	it('serializes the buyer SIREN when captured at checkout (B2B)', () => {
		const ctx = makeContext();
		ctx.buyer = { ...ctx.buyer, isCompany: true, siren: '987654321' };
		expect(ciiXml(ctx)).toContain('<ram:ID schemeID="0002">987654321</ram:ID>');
	});

	it('serializes VAT exemptions with their reason', () => {
		const ctx = makeContext({
			vatBreakdown: [
				{
					rate: 0,
					country: 'FR',
					amount: 0,
					base: 100,
					category: 'E',
					exemptionReason: 'TVA non applicable, art. 293 B du CGI'
				}
			],
			totals: { lineNet: 100, exclVat: 100, vat: 0, inclVat: 100, prepaid: 100, due: 0 }
		});
		const xml = ciiXml(ctx);
		expect(xml).toContain(
			'<ram:ExemptionReason>TVA non applicable, art. 293 B du CGI</ram:ExemptionReason>'
		);
		expect(xml).toContain('<ram:CategoryCode>E</ram:CategoryCode>');
	});

	it('serializes shipping and discount as document-level allowance/charge', () => {
		const ctx = makeContext({
			shipping: { amount: 5, vatRate: 20 },
			discount: 10,
			totals: { lineNet: 105, exclVat: 100, vat: 20, inclVat: 120, prepaid: 120, due: 0 }
		});
		const xml = ciiXml(ctx);
		expect(xml).toContain('<udt:Indicator>false</udt:Indicator>');
		expect(xml).toContain('<udt:Indicator>true</udt:Indicator>');
		expect(xml).toContain('<ram:AllowanceTotalAmount>10.00</ram:AllowanceTotalAmount>');
		expect(xml).toContain('<ram:ChargeTotalAmount>5.00</ram:ChargeTotalAmount>');
	});

	it('serializes rounding drift under its own "Rounding" reason, never as Discount', () => {
		const positive = makeContext({ discount: 0, rounding: 0.01 });
		const posXml = ciiXml(positive);
		expect(posXml).toContain('<ram:Reason>Rounding</ram:Reason>');
		expect(posXml).not.toContain('<ram:Reason>Discount</ram:Reason>');
		expect(posXml).toContain('<ram:AllowanceTotalAmount>0.01</ram:AllowanceTotalAmount>');

		const negative = makeContext({ discount: 0, rounding: -0.01 });
		const negXml = ciiXml(negative);
		expect(negXml).toContain('<ram:Reason>Rounding</ram:Reason>');
		expect(negXml).toContain('<ram:ChargeTotalAmount>0.01</ram:ChargeTotalAmount>');
	});
});

describe('paymentMeansTypeCode', () => {
	it('maps known methods to UNTDID 4461 codes', () => {
		expect(paymentMeansTypeCode('card')).toBe('48');
		expect(paymentMeansTypeCode('bank-transfer')).toBe('30');
		expect(paymentMeansTypeCode('paypal')).toBe('68');
		expect(paymentMeansTypeCode('point-of-sale', 'cash')).toBe('10');
		expect(paymentMeansTypeCode('point-of-sale', 'check')).toBe('20');
		expect(paymentMeansTypeCode('lightning')).toBe('ZZZ');
		expect(paymentMeansTypeCode('bitcoin')).toBe('ZZZ');
	});
});

describe('paidWithNote', () => {
	it('returns undefined without a rate', () => {
		const ctx = makeContext();
		delete ctx.paidWith.rate;
		expect(paidWithNote(ctx.paidWith, 'EUR')).toBeUndefined();
	});

	it('shows 8 decimals for BTC and 2 for fiat', () => {
		const ctx = makeContext();
		expect(paidWithNote(ctx.paidWith, 'EUR')).toContain('0.00123456 BTC');

		const fiat = makeContext({
			paidWith: {
				method: 'card',
				paidAt: new Date('2026-07-01T10:00:00Z'),
				amount: { amount: 130, currency: 'CHF' },
				display: { amount: 130, currency: 'CHF' },
				fiatEquivalent: { amount: 120, currency: 'EUR' },
				rate: { base: 'CHF', quote: 'EUR', amount: 0.92 }
			}
		});
		expect(paidWithNote(fiat.paidWith, 'EUR')).toContain('130.00 CHF');
		expect(paidWithNote(fiat.paidWith, 'EUR')).toContain('1 CHF = 0.92 EUR');
	});
});

describe('billingModeCode', () => {
	it('maps domestic goods/services/mixed', () => {
		expect(billingModeCode('goods', 'domestic')).toBe('B1');
		expect(billingModeCode('services', 'domestic')).toBe('S1');
		expect(billingModeCode('mixed', 'domestic')).toBe('M1');
	});

	it('maps intra-EU goods/services/mixed', () => {
		expect(billingModeCode('goods', 'intraEU')).toBe('B2');
		expect(billingModeCode('services', 'intraEU')).toBe('S2');
		expect(billingModeCode('mixed', 'intraEU')).toBe('M2');
	});

	it('maps export goods/services/mixed to documented codes', () => {
		expect(billingModeCode('goods', 'export')).toBe('B7');
		expect(billingModeCode('services', 'export')).toBe('S7');
		expect(billingModeCode('mixed', 'export')).toBe('M8');
	});
});
