import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { useI18n } from '$lib/i18n';
import { notoSansRegular } from './assets';
import type { InvoiceContext } from './context';

/**
 * Visual A4 layout of the e-invoice, drawn with pdf-lib (no browser). The
 * returned PDFDocument is not serialized yet: facturx.ts still attaches the
 * CII XML and the PDF/A-3 metadata before saving.
 *
 * Every glyph uses the embedded Noto Sans font — PDF/A forbids non-embedded
 * (standard-14) fonts.
 */

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 50;
const LINE_HEIGHT = 14;
const FONT_SIZE = 9;
const BLACK = rgb(0, 0, 0);
const GRAY = rgb(0.45, 0.45, 0.45);

interface Cursor {
	doc: PDFDocument;
	page: PDFPage;
	font: PDFFont;
	y: number;
}

function addPage(cursor: Cursor) {
	cursor.page = cursor.doc.addPage(A4);
	cursor.y = A4[1] - MARGIN;
}

function ensureSpace(cursor: Cursor, height: number) {
	if (cursor.y - height < MARGIN) {
		addPage(cursor);
	}
}

function text(
	cursor: Cursor,
	value: string,
	options?: { x?: number; size?: number; color?: ReturnType<typeof rgb>; rightAlignAt?: number }
) {
	const size = options?.size ?? FONT_SIZE;
	const x =
		options?.rightAlignAt !== undefined
			? options.rightAlignAt - cursor.font.widthOfTextAtSize(value, size)
			: options?.x ?? MARGIN;
	cursor.page.drawText(value, {
		x,
		y: cursor.y,
		size,
		font: cursor.font,
		color: options?.color ?? BLACK
	});
}

function newline(cursor: Cursor, height = LINE_HEIGHT) {
	cursor.y -= height;
	ensureSpace(cursor, LINE_HEIGHT);
}

function money(amount: number, currency: string): string {
	return `${amount.toFixed(2)} ${currency}`;
}

export async function renderInvoicePdf(ctx: InvoiceContext): Promise<PDFDocument> {
	const { t } = useI18n(ctx.locale || 'en');
	const doc = await PDFDocument.create();
	doc.registerFontkit(fontkit);
	const font = await doc.embedFont(new Uint8Array(await notoSansRegular()), { subset: true });

	const cursor: Cursor = { doc, page: doc.addPage(A4), font, y: A4[1] - MARGIN };
	const right = A4[0] - MARGIN;
	const dateFormat = (date: Date) => date.toLocaleDateString(ctx.locale || 'en');

	// Header
	text(cursor, t('eInvoice.invoiceTitle', { invoiceNumber: String(ctx.invoiceNumber) }), {
		size: 16
	});
	newline(cursor, 20);
	text(cursor, `${t('eInvoice.issueDate')}: ${dateFormat(ctx.issueDate)}`, { color: GRAY });
	newline(cursor);
	text(
		cursor,
		t('eInvoice.orderRef', {
			orderNumber: String(ctx.orderNumber),
			orderDate: dateFormat(ctx.orderCreatedAt)
		}),
		{ color: GRAY }
	);
	newline(cursor, 28);

	// Seller / buyer blocks side by side
	const blockTop = cursor.y;
	const drawParty = (
		title: string,
		party: InvoiceContext['seller'],
		x: number,
		withLegal: boolean
	) => {
		cursor.y = blockTop;
		text(cursor, title, { x, color: GRAY });
		newline(cursor);
		text(cursor, party.name, { x });
		newline(cursor);
		if (party.address) {
			text(cursor, party.address.street, { x });
			newline(cursor);
			text(cursor, `${party.address.zip} ${party.address.city}, ${party.address.country}`, { x });
			newline(cursor);
		}
		if (party.vatNumber) {
			text(cursor, `${t('eInvoice.vatNumber')}: ${party.vatNumber}`, { x });
			newline(cursor);
		}
		if (withLegal && party.siret) {
			text(cursor, `${t('eInvoice.siret')}: ${party.siret}`, { x });
			newline(cursor);
		}
		if (withLegal && party.legalForm) {
			text(cursor, party.legalForm, { x });
			newline(cursor);
		}
		if (party.email) {
			text(cursor, party.email, { x });
			newline(cursor);
		}
		return cursor.y;
	};
	const sellerBottom = drawParty(t('eInvoice.seller'), ctx.seller, MARGIN, true);
	const buyerBottom = drawParty(t('eInvoice.buyer'), ctx.buyer, A4[0] / 2 + 10, false);
	cursor.y = Math.min(sellerBottom, buyerBottom) - 14;
	ensureSpace(cursor, LINE_HEIGHT);

	// Items table
	const columns = {
		name: MARGIN,
		quantity: 330,
		unitPrice: 415,
		vatRate: 455,
		total: right
	};
	const tableHeader = () => {
		text(cursor, t('eInvoice.item'), { color: GRAY });
		text(cursor, t('eInvoice.quantity'), { rightAlignAt: columns.quantity + 30, color: GRAY });
		text(cursor, t('eInvoice.unitPriceExclVat'), {
			rightAlignAt: columns.vatRate - 10,
			color: GRAY
		});
		text(cursor, t('eInvoice.vatRate'), { rightAlignAt: columns.vatRate + 35, color: GRAY });
		text(cursor, t('eInvoice.lineTotal'), { rightAlignAt: columns.total, color: GRAY });
		newline(cursor, 6);
		cursor.page.drawLine({
			start: { x: MARGIN, y: cursor.y },
			end: { x: right, y: cursor.y },
			thickness: 0.5,
			color: GRAY
		});
		newline(cursor, 12);
	};
	tableHeader();
	for (const line of ctx.lines) {
		ensureSpace(cursor, LINE_HEIGHT * 2);
		// Truncate long product names rather than overlapping the numeric columns
		let name = line.name;
		while (
			name.length > 8 &&
			font.widthOfTextAtSize(name, FONT_SIZE) > columns.quantity - MARGIN - 20
		) {
			name = name.slice(0, -4) + '…';
		}
		text(cursor, name);
		text(cursor, String(line.quantity), { rightAlignAt: columns.quantity + 30 });
		text(cursor, money(line.unitPrice, ctx.currency), { rightAlignAt: columns.vatRate - 10 });
		text(cursor, `${line.vatRate}%`, { rightAlignAt: columns.vatRate + 35 });
		text(cursor, money(line.netAmount, ctx.currency), { rightAlignAt: columns.total });
		newline(cursor);
	}
	newline(cursor, 6);
	cursor.page.drawLine({
		start: { x: MARGIN, y: cursor.y },
		end: { x: right, y: cursor.y },
		thickness: 0.5,
		color: GRAY
	});
	newline(cursor, 16);

	// Totals block (right-aligned label/value pairs)
	const totalRow = (label: string, value: string, options?: { bold?: boolean }) => {
		ensureSpace(cursor, LINE_HEIGHT);
		text(cursor, label, { rightAlignAt: right - 110, size: options?.bold ? 10 : FONT_SIZE });
		text(cursor, value, { rightAlignAt: right, size: options?.bold ? 10 : FONT_SIZE });
		newline(cursor);
	};
	if (ctx.discount > 0) {
		totalRow(t('eInvoice.discount'), money(-ctx.discount, ctx.currency));
	}
	if (ctx.shipping) {
		totalRow(t('eInvoice.deliveryFees'), money(ctx.shipping.amount, ctx.currency));
	}
	if (ctx.rounding !== 0) {
		totalRow(t('eInvoice.rounding'), money(-ctx.rounding, ctx.currency));
	}
	totalRow(t('eInvoice.totalExclVat'), money(ctx.totals.exclVat, ctx.currency));
	for (const vat of ctx.vatBreakdown) {
		if (vat.amount > 0 || ctx.vatBreakdown.length > 1) {
			totalRow(`${t('eInvoice.totalVat')} (${vat.rate}%)`, money(vat.amount, ctx.currency));
		}
	}
	totalRow(t('eInvoice.totalInclVat'), money(ctx.totals.inclVat, ctx.currency), { bold: true });
	totalRow(t('eInvoice.prepaid'), money(ctx.totals.prepaid, ctx.currency));
	totalRow(t('eInvoice.due'), money(ctx.totals.due, ctx.currency));
	newline(cursor, 10);

	// Payment block — includes the actual payment currency and its rate when it
	// differs from the invoice currency ("Paid with BTC: … — 1 BTC = … EUR")
	ensureSpace(cursor, LINE_HEIGHT * 5);
	text(cursor, t('eInvoice.payment'), { color: GRAY });
	newline(cursor);
	const methodName = ctx.paidWith.methodLabel ?? t('checkout.paymentMethod.' + ctx.paidWith.method);
	text(cursor, `${t('eInvoice.paymentMethod')}: ${methodName}`);
	newline(cursor);
	text(cursor, t('eInvoice.paidAt', { date: dateFormat(ctx.paidWith.paidAt) }));
	newline(cursor);
	if (ctx.paidWith.rate) {
		const displayAmount = ctx.paidWith.display.amount.toFixed(
			ctx.paidWith.display.currency === 'BTC' ? 8 : 2
		);
		text(
			cursor,
			t('eInvoice.paidWith', {
				currency: ctx.paidWith.display.currency,
				amount: `${displayAmount} ${ctx.paidWith.display.currency} (${money(
					ctx.paidWith.fiatEquivalent.amount,
					ctx.paidWith.fiatEquivalent.currency
				)})`
			})
		);
		newline(cursor);
		text(
			cursor,
			t('eInvoice.rateAtPaymentTime', {
				base: ctx.paidWith.rate.base,
				rate: ctx.paidWith.rate.amount.toFixed(2),
				quote: ctx.paidWith.rate.quote
			}),
			{ color: GRAY }
		);
		newline(cursor);
	}

	// Legal mentions footer
	const exemption = ctx.vatBreakdown.find((entry) => entry.exemptionReason)?.exemptionReason;
	if (exemption) {
		newline(cursor, 8);
		text(cursor, t('eInvoice.vatExemption', { reason: exemption }), { color: GRAY });
		newline(cursor);
	}

	return doc;
}
