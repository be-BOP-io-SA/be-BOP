import { describe, expect, it } from 'vitest';
import { toBai2, toCamt053, toCfonb120, toCsv, type ExportEntry } from './pos-exports';
import { runtimeConfig } from './runtime-config';

const entry = (number: number, totalMinor: number, ref: string | null): ExportEntry => ({
	id: `id${number}`,
	number,
	paidAt: new Date('2026-11-21T10:00:00Z'),
	ref,
	currency: runtimeConfig.mainCurrency,
	sale: 0,
	tip: 0,
	total: 0,
	totalMinor,
	method: 'lightning',
	processor: 'phoenixd',
	transactionId: 'tx' + number,
	device: 'Bar',
	operator: 'Alice'
});

const entries = [entry(1, 1250, 'T-42'), entry(2, 500, null)];
const from = new Date('2026-11-21T00:00:00Z');
const to = new Date('2026-11-21T23:59:59Z');

describe('terminal payment exports', () => {
	it('writes CFONB 120 records of 120 characters, from old to new balance', () => {
		const lines = toCfonb120(entries, from, to).split('\r\n').slice(0, -1);
		expect(lines.map((l) => l.length)).toEqual([120, 120, 120, 120]);
		expect(lines.map((l) => l.slice(0, 2))).toEqual(['01', '04', '04', '07']);
		// 1750 in minor units, positive: last digit 0 written as "{".
		expect(lines[3].slice(90, 104)).toBe('0000000000175{');
	});

	it('balances the BAI2 control totals and record counts', () => {
		const records = toBai2(entries, to).trimEnd().split('\n');
		expect(records[0].startsWith('01,')).toBe(true);
		expect(records.at(-1)).toBe(`99,3500,1,${records.length}/`);
		expect(records.find((r) => r.startsWith('49,'))).toBe('49,3500,4/');
	});

	it('counts the camt.053 entries and keeps the till reference', () => {
		const statement = toCamt053(entries, from, to);
		expect(statement).toContain('<NbOfNtries>2</NbOfNtries>');
		expect(statement).toContain('<EndToEndId>T-42</EndToEndId>');
		expect(statement).toContain('<EndToEndId>NOTPROVIDED</EndToEndId>');
	});

	it('writes one CSV row per payment', () => {
		expect(toCsv(entries).split('\n')).toHaveLength(3);
	});
});
