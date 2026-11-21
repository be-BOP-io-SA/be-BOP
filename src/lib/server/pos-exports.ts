import { collections } from './database';
import { runtimeConfig } from './runtime-config';
import { CURRENCY_UNIT, type Currency } from '$lib/types/Currency';
import { toCurrency } from '$lib/utils/toCurrency';
import { csvCell } from '$lib/utils/csvCell';

/**
 * Reconciliation exports of the payments taken on paired terminals, in the formats accounting
 * software imports as bank statements: CSV, camt.053, camt.054, CFONB 120 and BAI2. One entry per
 * paid payment, credited on the day it was paid, with the till reference when there is one.
 */

export const POS_EXPORT_FORMATS = ['csv', 'camt053', 'camt054', 'cfonb120', 'bai2'] as const;
export type PosExportFormat = (typeof POS_EXPORT_FORMATS)[number];

export interface ExportEntry {
	id: string;
	number: number;
	paidAt: Date;
	ref: string | null;
	currency: Currency;
	sale: number;
	tip: number;
	total: number;
	/** The total in minor units of the currency, as statements count. */
	totalMinor: number;
	method: string;
	processor: string;
	transactionId: string;
	device: string;
	operator: string;
}

export async function posExportEntries(from: Date, to: Date): Promise<ExportEntry[]> {
	const currency = runtimeConfig.mainCurrency;
	const payments = await collections.posPayments
		.find({ 'payment.status': 'paid', 'payment.paidAt': { $gte: from, $lte: to } })
		.sort({ 'payment.paidAt': 1 })
		.toArray();

	return payments.map((p) => {
		const sale = toCurrency(currency, p.amount.amount, p.amount.currency);
		const tip = toCurrency(currency, p.tip.amount, p.tip.currency);
		return {
			id: p._id.toHexString(),
			number: p.number,
			paidAt: p.payment.paidAt ?? p.createdAt,
			ref: p.externalRef ?? null,
			currency,
			sale,
			tip,
			total: sale + tip,
			totalMinor: Math.round((sale + tip) / CURRENCY_UNIT[currency]),
			method: p.payment.method,
			processor: p.payment.processor ?? '',
			transactionId: p.payment.transactions?.[0]?.id ?? p.payment.invoiceId ?? '',
			device: p.device.name,
			operator: p.operator?.alias ?? ''
		};
	});
}

/** The statement's account: the shop's IBAN when it has one. */
function account() {
	const iban = runtimeConfig.sellerIdentity?.bank?.iban?.replace(/\s+/g, '').toUpperCase() ?? '';
	return { iban, bic: runtimeConfig.sellerIdentity?.bank?.bic ?? '' };
}

const label = (e: ExportEntry) =>
	`be-BOP PoS #${e.number} ${e.method}${e.processor ? ' ' + e.processor : ''}${
		e.ref ? ' ref ' + e.ref : ' no till ref'
	}`;

const isoDate = (date: Date) => date.toISOString().slice(0, 10);
const decimals = (currency: Currency) =>
	Math.max(0, Math.round(-Math.log10(CURRENCY_UNIT[currency])));
const amountText = (minor: number, currency: Currency) =>
	(minor / 10 ** decimals(currency)).toFixed(decimals(currency));

export function toCsv(entries: ExportEntry[]): string {
	const header =
		'paidAt,number,tillReference,method,processor,sale,tip,total,currency,transactionId,terminal,operator';
	const rows = entries.map((e) =>
		[
			e.paidAt.toISOString(),
			e.number,
			csvCell(e.ref ?? ''),
			e.method,
			e.processor,
			e.sale,
			e.tip,
			e.total,
			e.currency,
			csvCell(e.transactionId),
			csvCell(e.device),
			csvCell(e.operator)
		].join(',')
	);
	return [header, ...rows].join('\n');
}

const xml = (value: string) =>
	value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function camtAccount(currency: Currency): string {
	const { iban } = account();
	const id = iban ? `<IBAN>${xml(iban)}</IBAN>` : `<Othr><Id>BEBOP-POS</Id></Othr>`;
	return `<Acct><Id>${id}</Id><Ccy>${currency}</Ccy></Acct>`;
}

function camtEntry(e: ExportEntry): string {
	const amount = amountText(e.totalMinor, e.currency);
	return `<Ntry><NtryRef>${e.number}</NtryRef><Amt Ccy="${
		e.currency
	}">${amount}</Amt><CdtDbtInd>CRDT</CdtDbtInd><Sts>BOOK</Sts><BookgDt><Dt>${isoDate(
		e.paidAt
	)}</Dt></BookgDt><ValDt><Dt>${isoDate(e.paidAt)}</Dt></ValDt><AcctSvcrRef>${xml(
		e.id
	)}</AcctSvcrRef><BkTxCd><Prtry><Cd>POS</Cd><Issr>be-BOP</Issr></Prtry></BkTxCd><NtryDtls><TxDtls><Refs><EndToEndId>${xml(
		(e.ref ?? 'NOTPROVIDED').slice(0, 35)
	)}</EndToEndId>${
		e.transactionId ? `<TxId>${xml(e.transactionId.slice(0, 35))}</TxId>` : ''
	}</Refs><AmtDtls><TxAmt><Amt Ccy="${
		e.currency
	}">${amount}</Amt></TxAmt></AmtDtls><RmtInf><Ustrd>${xml(
		label(e).slice(0, 140)
	)}</Ustrd></RmtInf></TxDtls></NtryDtls></Ntry>`;
}

function camt(kind: '053' | '054', entries: ExportEntry[], from: Date, to: Date): string {
	const currency = runtimeConfig.mainCurrency;
	const now = new Date();
	const id = `BEBOP-POS-${now.getTime()}`;
	const totalMinor = entries.reduce((sum, e) => sum + e.totalMinor, 0);
	const period = `<FrToDt><FrDtTm>${from.toISOString()}</FrDtTm><ToDtTm>${to.toISOString()}</ToDtTm></FrToDt>`;
	const body = entries.map(camtEntry).join('');
	const header = `<GrpHdr><MsgId>${id}</MsgId><CreDtTm>${now.toISOString()}</CreDtTm></GrpHdr>`;

	if (kind === '053') {
		// A statement of the period alone: it opens at zero and closes on what the terminals took.
		const balance = (code: 'OPBD' | 'CLBD', minor: number, date: Date) =>
			`<Bal><Tp><CdOrPrtry><Cd>${code}</Cd></CdOrPrtry></Tp><Amt Ccy="${currency}">${amountText(
				minor,
				currency
			)}</Amt><CdtDbtInd>CRDT</CdtDbtInd><Dt><Dt>${isoDate(date)}</Dt></Dt></Bal>`;
		return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.02"><BkToCstmrStmt>${header}<Stmt><Id>${id}</Id><CreDtTm>${now.toISOString()}</CreDtTm>${period}${camtAccount(
			currency
		)}${balance('OPBD', 0, from)}${balance(
			'CLBD',
			totalMinor,
			to
		)}<TxsSummry><TtlNtries><NbOfNtries>${
			entries.length
		}</NbOfNtries></TtlNtries></TxsSummry>${body}</Stmt></BkToCstmrStmt></Document>
`;
	}
	return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.054.001.02"><BkToCstmrDbtCdtNtfctn>${header}<Ntfctn><Id>${id}</Id><CreDtTm>${now.toISOString()}</CreDtTm>${period}${camtAccount(
		currency
	)}${body}</Ntfctn></BkToCstmrDbtCdtNtfctn></Document>
`;
}

export const toCamt053 = (entries: ExportEntry[], from: Date, to: Date) =>
	camt('053', entries, from, to);
export const toCamt054 = (entries: ExportEntry[], from: Date, to: Date) =>
	camt('054', entries, from, to);

/**
 * CFONB 120, the French bank statement in fixed 120-character records: 01 old balance, 04 one per
 * movement, 07 new balance. The bank, branch and account come from a French IBAN when the shop has
 * one, zeros otherwise.
 */
export function toCfonb120(entries: ExportEntry[], from: Date, to: Date): string {
	const currency = runtimeConfig.mainCurrency;
	const { iban } = account();
	const french = /^FR\d{2}(\d{5})(\d{5})([0-9A-Z]{11})\d{2}$/.exec(iban);
	const bank = french?.[1] ?? '00000';
	const branch = french?.[2] ?? '00000';
	const accountNumber = french?.[3] ?? 'BEBOPPOS000';
	const nbDecimals = decimals(currency);

	const pad = (value: string, length: number) => value.slice(0, length).padEnd(length, ' ');
	const date = (d: Date) =>
		`${String(d.getDate()).padStart(2, '0')}${String(d.getMonth() + 1).padStart(2, '0')}${String(
			d.getFullYear() % 100
		).padStart(2, '0')}`;
	// 13 digits and a last character carrying the sign: { A…I for positive, } J…R for negative.
	const amount = (minor: number) => {
		const digits = String(Math.abs(minor)).padStart(14, '0').slice(-14);
		const last = Number(digits[13]);
		const signed = minor < 0 ? '}JKLMNOPQR'[last] : '{ABCDEFGHI'[last];
		return digits.slice(0, 13) + signed;
	};
	const head = (code: string, internal: string) =>
		`${code}${bank}${pad(internal, 4)}${branch}${currency.slice(0, 3)}${nbDecimals} ${pad(
			accountNumber,
			11
		)}`;

	const balance = (code: '01' | '07', minor: number, d: Date) =>
		`${head(code, '')}  ${date(d)}${' '.repeat(50)}${amount(minor)}${' '.repeat(16)}`;
	const movement = (e: ExportEntry, index: number) =>
		`${head('04', 'POS')}  ${date(e.paidAt)}  ${date(e.paidAt)}${pad(label(e), 31)}  ${String(
			index + 1
		).padStart(7, '0')}  ${amount(e.totalMinor)}${pad(e.ref ?? 'SANS REF CAISSE', 16)}`;

	const totalMinor = entries.reduce((sum, e) => sum + e.totalMinor, 0);
	const lines = [balance('01', 0, from), ...entries.map(movement), balance('07', totalMinor, to)];
	return lines.join('\r\n') + '\r\n';
}

/**
 * BAI2, the cash management format of US banks: file, group and account records, one 16
 * transaction record per payment, with control totals in minor units.
 */
export function toBai2(entries: ExportEntry[], to: Date): string {
	const currency = runtimeConfig.mainCurrency;
	const { iban } = account();
	const now = new Date();
	const yymmdd = (d: Date) => d.toISOString().slice(2, 10).replace(/-/g, '');
	const hhmm = (d: Date) => d.toISOString().slice(11, 16).replace(':', '');
	const clean = (value: string) => value.replace(/[,/]/g, ' ');
	const accountNumber = iban || 'BEBOP-POS';
	const totalMinor = entries.reduce((sum, e) => sum + e.totalMinor, 0);

	const accountRecords = [
		`03,${accountNumber},${currency},010,0,,,015,${totalMinor},,/`,
		...entries.map(
			(e) =>
				`16,399,${e.totalMinor},Z,${clean(e.transactionId || e.id)},${clean(e.ref ?? '')},${clean(
					label(e)
				)}/`
		)
	];
	// The account control total sums the amounts of the 03 and 16 records.
	const accountTotal = totalMinor + entries.reduce((sum, e) => sum + e.totalMinor, 0);
	const accountTrailer = `49,${accountTotal},${accountRecords.length + 1}/`;
	const groupRecords = [
		`02,BEBOP,${clean(runtimeConfig.brandName).slice(0, 20)},1,${yymmdd(to)},${hhmm(
			to
		)},${currency},2/`,
		...accountRecords,
		accountTrailer
	];
	const groupTrailer = `98,${accountTotal},1,${groupRecords.length + 1}/`;
	const fileRecords = [
		`01,BEBOP,${clean(runtimeConfig.brandName).slice(0, 20)},${yymmdd(now)},${hhmm(now)},${
			now.getTime() % 1_000_000
		},,,2/`,
		...groupRecords,
		groupTrailer
	];
	return [...fileRecords, `99,${accountTotal},1,${fileRecords.length + 1}/`].join('\n') + '\n';
}
