import type { PaymentMethod } from '$lib/server/payment-methods';
import type {
	InvoiceContext,
	OperationNature,
	PaidWith,
	TransactionCategory,
	VatBreakdownEntry
} from './context';

/**
 * UN/CEFACT CII serializer for the EN16931 semantic model (the XML embedded in
 * a Factur-X PDF as factur-x.xml, guideline urn:cen.eu:en16931:2017).
 *
 * Hand-rolled on purpose: the document is a fixed-shape template, so a
 * serializer library would only obscure the (schema-ordered!) element
 * sequence, and golden-file tests keep the output honest.
 */

function esc(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

/** EN16931 amounts are expressed with 2 decimals */
function amount(value: number): string {
	return value.toFixed(2);
}

/** udt:DateTimeString format 102: YYYYMMDD */
function dateTime102(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}${month}${day}`;
}

/**
 * UNTDID 4461 payment means codes. Crypto and be-BOP-specific methods have no
 * dedicated code and use ZZZ (mutually defined); the human-readable detail
 * lives in the BT-22 note.
 */
export function paymentMeansTypeCode(method: PaymentMethod, posSubtype?: string): string {
	switch (method) {
		case 'card':
			return '48';
		case 'bank-transfer':
			return '30';
		case 'paypal':
			return '68';
		case 'point-of-sale':
			return posSubtype === 'cash' ? '10' : posSubtype === 'check' ? '20' : 'ZZZ';
		default:
			return 'ZZZ';
	}
}

/**
 * BT-22 note describing the actual payment when it happened in another
 * currency (e.g. BTC/SAT): the structured amounts stay in the fiat invoice
 * currency to remain schema-valid, this note carries the crypto details.
 */
export function paidWithNote(paidWith: PaidWith, invoiceCurrency: string): string | undefined {
	if (!paidWith.rate) {
		return undefined;
	}
	const rate = `1 ${paidWith.rate.base} = ${paidWith.rate.amount.toFixed(2)} ${
		paidWith.rate.quote
	}`;
	const displayed = `${paidWith.display.amount.toFixed(
		paidWith.display.currency === 'BTC' ? 8 : 2
	)} ${paidWith.display.currency}`;
	const equivalent = `${amount(paidWith.fiatEquivalent.amount)} ${invoiceCurrency}`;
	return `Paid with ${paidWith.display.currency}: ${displayed} (${equivalent}) — ${rate} (rate at payment time)`;
}

/**
 * French e-invoicing "mode de facturation" code (BT-23, BR-FR-08), chosen
 * from the fixed list the reform's business rules accept. Only the domestic
 * and intra-EU cases are confidently mapped from the DGFiP flux reference —
 * export defaults to the closest documented code (B7/S7/M8) and should be
 * verified against the official spec before relying on it for real non-EU
 * exports.
 */
export function billingModeCode(nature: OperationNature, category: TransactionCategory): string {
	if (category === 'domestic') {
		return nature === 'goods' ? 'B1' : nature === 'services' ? 'S1' : 'M1';
	}
	if (category === 'intraEU') {
		return nature === 'goods' ? 'B2' : nature === 'services' ? 'S2' : 'M2';
	}
	return nature === 'goods' ? 'B7' : nature === 'services' ? 'S7' : 'M8';
}

/**
 * Mandatory French legal mentions (Code de commerce Art. L441-6/L441-10):
 * late-payment recovery fee, late-payment penalty rate, and early-payment
 * discount policy. BR-FR-05 only checks that a note with each SubjectCode
 * exists, not its wording.
 */
function frenchMandatoryNotesXml(): string[] {
	const notes: Array<{ code: string; content: string }> = [
		{
			code: 'PMT',
			content:
				'En cas de retard de paiement, une indemnité forfaitaire pour frais de recouvrement de 40 € sera exigée (art. L441-10 et D441-5 du Code de commerce).'
		},
		{
			code: 'PMD',
			content: "Taux des pénalités de retard : trois fois le taux d'intérêt légal en vigueur."
		},
		{ code: 'AAB', content: 'Escompte pour paiement anticipé : néant.' }
	];
	return notes.flatMap(({ code, content }) => [
		'<ram:IncludedNote>',
		`<ram:Content>${esc(content)}</ram:Content>`,
		`<ram:SubjectCode>${code}</ram:SubjectCode>`,
		'</ram:IncludedNote>'
	]);
}

function partyXml(
	tag: 'SellerTradeParty' | 'BuyerTradeParty',
	party: InvoiceContext['seller']
): string {
	const lines: string[] = [`<ram:${tag}>`, `<ram:Name>${esc(party.name)}</ram:Name>`];
	if (party.siren) {
		lines.push(
			'<ram:SpecifiedLegalOrganization>',
			`<ram:ID schemeID="0002">${esc(party.siren)}</ram:ID>`,
			'</ram:SpecifiedLegalOrganization>'
		);
	}
	if (party.address) {
		lines.push(
			'<ram:PostalTradeAddress>',
			`<ram:PostcodeCode>${esc(party.address.zip)}</ram:PostcodeCode>`,
			`<ram:LineOne>${esc(party.address.street)}</ram:LineOne>`,
			`<ram:CityName>${esc(party.address.city)}</ram:CityName>`,
			`<ram:CountryID>${esc(party.address.country)}</ram:CountryID>`,
			'</ram:PostalTradeAddress>'
		);
	}
	if (party.email) {
		lines.push(
			'<ram:URIUniversalCommunication>',
			`<ram:URIID schemeID="EM">${esc(party.email)}</ram:URIID>`,
			'</ram:URIUniversalCommunication>'
		);
	}
	if (party.vatNumber) {
		lines.push(
			'<ram:SpecifiedTaxRegistration>',
			`<ram:ID schemeID="VA">${esc(party.vatNumber)}</ram:ID>`,
			'</ram:SpecifiedTaxRegistration>'
		);
	}
	lines.push(`</ram:${tag}>`);
	return lines.join('\n');
}

function tradeTaxXml(entry: VatBreakdownEntry): string {
	return [
		'<ram:ApplicableTradeTax>',
		`<ram:CalculatedAmount>${amount(entry.amount)}</ram:CalculatedAmount>`,
		'<ram:TypeCode>VAT</ram:TypeCode>',
		...(entry.exemptionReason
			? [`<ram:ExemptionReason>${esc(entry.exemptionReason)}</ram:ExemptionReason>`]
			: []),
		`<ram:BasisAmount>${amount(entry.base)}</ram:BasisAmount>`,
		`<ram:CategoryCode>${entry.category}</ram:CategoryCode>`,
		`<ram:RateApplicablePercent>${entry.rate}</ram:RateApplicablePercent>`,
		'</ram:ApplicableTradeTax>'
	].join('\n');
}

function allowanceChargeXml(
	isCharge: boolean,
	value: number,
	reason: string,
	vat: VatBreakdownEntry
): string {
	return [
		'<ram:SpecifiedTradeAllowanceCharge>',
		'<ram:ChargeIndicator>',
		`<udt:Indicator>${isCharge}</udt:Indicator>`,
		'</ram:ChargeIndicator>',
		`<ram:ActualAmount>${amount(value)}</ram:ActualAmount>`,
		`<ram:Reason>${esc(reason)}</ram:Reason>`,
		'<ram:CategoryTradeTax>',
		'<ram:TypeCode>VAT</ram:TypeCode>',
		`<ram:CategoryCode>${vat.category}</ram:CategoryCode>`,
		`<ram:RateApplicablePercent>${vat.rate}</ram:RateApplicablePercent>`,
		'</ram:CategoryTradeTax>',
		'</ram:SpecifiedTradeAllowanceCharge>'
	].join('\n');
}

function lineXml(line: InvoiceContext['lines'][0], index: number, ctx: InvoiceContext): string {
	const category = ctx.vatBreakdown.find((entry) => entry.rate === line.vatRate)?.category ?? 'S';
	return [
		'<ram:IncludedSupplyChainTradeLineItem>',
		'<ram:AssociatedDocumentLineDocument>',
		`<ram:LineID>${index + 1}</ram:LineID>`,
		'</ram:AssociatedDocumentLineDocument>',
		'<ram:SpecifiedTradeProduct>',
		`<ram:Name>${esc(line.name)}</ram:Name>`,
		'</ram:SpecifiedTradeProduct>',
		'<ram:SpecifiedLineTradeAgreement>',
		'<ram:NetPriceProductTradePrice>',
		`<ram:ChargeAmount>${amount(line.unitPrice)}</ram:ChargeAmount>`,
		'</ram:NetPriceProductTradePrice>',
		'</ram:SpecifiedLineTradeAgreement>',
		'<ram:SpecifiedLineTradeDelivery>',
		`<ram:BilledQuantity unitCode="C62">${line.quantity}</ram:BilledQuantity>`,
		'</ram:SpecifiedLineTradeDelivery>',
		'<ram:SpecifiedLineTradeSettlement>',
		'<ram:ApplicableTradeTax>',
		'<ram:TypeCode>VAT</ram:TypeCode>',
		`<ram:CategoryCode>${category}</ram:CategoryCode>`,
		`<ram:RateApplicablePercent>${line.vatRate}</ram:RateApplicablePercent>`,
		'</ram:ApplicableTradeTax>',
		'<ram:SpecifiedTradeSettlementLineMonetarySummation>',
		`<ram:LineTotalAmount>${amount(line.netAmount)}</ram:LineTotalAmount>`,
		'</ram:SpecifiedTradeSettlementLineMonetarySummation>',
		'</ram:SpecifiedLineTradeSettlement>',
		'</ram:IncludedSupplyChainTradeLineItem>'
	].join('\n');
}

export function ciiXml(ctx: InvoiceContext): string {
	const note = paidWithNote(ctx.paidWith, ctx.currency);
	const firstVat = ctx.vatBreakdown[0];
	const chargeTotal = (ctx.shipping?.amount ?? 0) + ctx.extraCharge;
	// BR-FR rules (French e-invoicing reform) on top of core EN16931 — only
	// meaningful for country 'FR'.
	const isFrance = ctx.country === 'FR';

	return [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100" xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100" xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">',
		'<rsm:ExchangedDocumentContext>',
		...(isFrance
			? [
					'<ram:BusinessProcessSpecifiedDocumentContextParameter>',
					`<ram:ID>${billingModeCode(ctx.operationNature, ctx.transactionCategory)}</ram:ID>`,
					'</ram:BusinessProcessSpecifiedDocumentContextParameter>'
			  ]
			: []),
		'<ram:GuidelineSpecifiedDocumentContextParameter>',
		'<ram:ID>urn:cen.eu:en16931:2017</ram:ID>',
		'</ram:GuidelineSpecifiedDocumentContextParameter>',
		'</rsm:ExchangedDocumentContext>',
		'<rsm:ExchangedDocument>',
		`<ram:ID>${ctx.invoiceNumber}</ram:ID>`,
		// 380 = commercial invoice (UNTDID 1001)
		'<ram:TypeCode>380</ram:TypeCode>',
		'<ram:IssueDateTime>',
		`<udt:DateTimeString format="102">${dateTime102(ctx.issueDate)}</udt:DateTimeString>`,
		'</ram:IssueDateTime>',
		...(note
			? ['<ram:IncludedNote>', `<ram:Content>${esc(note)}</ram:Content>`, '</ram:IncludedNote>']
			: []),
		...(isFrance ? frenchMandatoryNotesXml() : []),
		'</rsm:ExchangedDocument>',
		'<rsm:SupplyChainTradeTransaction>',
		...ctx.lines.map((line, i) => lineXml(line, i, ctx)),
		'<ram:ApplicableHeaderTradeAgreement>',
		partyXml('SellerTradeParty', ctx.seller),
		partyXml('BuyerTradeParty', ctx.buyer),
		'<ram:BuyerOrderReferencedDocument>',
		`<ram:IssuerAssignedID>${ctx.orderNumber}</ram:IssuerAssignedID>`,
		'</ram:BuyerOrderReferencedDocument>',
		'</ram:ApplicableHeaderTradeAgreement>',
		'<ram:ApplicableHeaderTradeDelivery>',
		'<ram:ActualDeliverySupplyChainEvent>',
		'<ram:OccurrenceDateTime>',
		`<udt:DateTimeString format="102">${dateTime102(ctx.issueDate)}</udt:DateTimeString>`,
		'</ram:OccurrenceDateTime>',
		'</ram:ActualDeliverySupplyChainEvent>',
		'</ram:ApplicableHeaderTradeDelivery>',
		'<ram:ApplicableHeaderTradeSettlement>',
		`<ram:InvoiceCurrencyCode>${ctx.currency}</ram:InvoiceCurrencyCode>`,
		'<ram:SpecifiedTradeSettlementPaymentMeans>',
		`<ram:TypeCode>${paymentMeansTypeCode(
			ctx.paidWith.method,
			ctx.paidWith.posSubtype
		)}</ram:TypeCode>`,
		'</ram:SpecifiedTradeSettlementPaymentMeans>',
		...ctx.vatBreakdown.map(tradeTaxXml),
		...(ctx.allowance > 0 && firstVat
			? [allowanceChargeXml(false, ctx.allowance, 'Discount', firstVat)]
			: []),
		...(ctx.shipping && firstVat
			? [allowanceChargeXml(true, ctx.shipping.amount, 'Delivery fees', firstVat)]
			: []),
		...(ctx.extraCharge > 0 && firstVat
			? [allowanceChargeXml(true, ctx.extraCharge, 'Rounding', firstVat)]
			: []),
		'<ram:SpecifiedTradePaymentTerms>',
		`<ram:DueDateDateTime><udt:DateTimeString format="102">${dateTime102(
			ctx.issueDate
		)}</udt:DateTimeString></ram:DueDateDateTime>`,
		'</ram:SpecifiedTradePaymentTerms>',
		'<ram:SpecifiedTradeSettlementHeaderMonetarySummation>',
		`<ram:LineTotalAmount>${amount(ctx.totals.lineNet)}</ram:LineTotalAmount>`,
		`<ram:ChargeTotalAmount>${amount(chargeTotal)}</ram:ChargeTotalAmount>`,
		`<ram:AllowanceTotalAmount>${amount(ctx.allowance)}</ram:AllowanceTotalAmount>`,
		`<ram:TaxBasisTotalAmount>${amount(ctx.totals.exclVat)}</ram:TaxBasisTotalAmount>`,
		`<ram:TaxTotalAmount currencyID="${ctx.currency}">${amount(
			ctx.totals.vat
		)}</ram:TaxTotalAmount>`,
		`<ram:GrandTotalAmount>${amount(ctx.totals.inclVat)}</ram:GrandTotalAmount>`,
		`<ram:TotalPrepaidAmount>${amount(ctx.totals.prepaid)}</ram:TotalPrepaidAmount>`,
		`<ram:DuePayableAmount>${amount(ctx.totals.due)}</ram:DuePayableAmount>`,
		'</ram:SpecifiedTradeSettlementHeaderMonetarySummation>',
		'</ram:ApplicableHeaderTradeSettlement>',
		'</rsm:SupplyChainTradeTransaction>',
		'</rsm:CrossIndustryInvoice>'
	].join('\n');
}
