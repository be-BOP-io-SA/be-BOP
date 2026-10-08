import { describe, expect, it } from 'vitest';
import { columnsToCsv, toCsv, type ReportingColumn } from './reportingColumns';

describe('toCsv', () => {
	it('joins plain cells with commas and rows with newlines', () => {
		expect(toCsv(['a', 'b'], [['1', '2']])).toBe('a,b\n1,2');
	});

	it('quotes cells containing a comma, a quote or a line break', () => {
		expect(toCsv(['x'], [['1,5'], ['say "hi"'], ['line1\nline2'], ['cr\rhere']])).toBe(
			'x\n"1,5"\n"say ""hi"""\n"line1\nline2"\n"cr\rhere"'
		);
	});

	it('outputs only the header without rows', () => {
		expect(toCsv(['a', 'b'], [])).toBe('a,b');
	});
});

describe('columnsToCsv', () => {
	type Row = { name: string; amount?: number };
	const columns: ReportingColumn<Row>[] = [
		{ header: 'Name', cell: (row) => row.name, href: (row) => `/x/${row.name}` },
		{ header: 'Amount', cell: (row) => row.amount }
	];

	it('exports cell text, not links, and blanks missing values', () => {
		expect(columnsToCsv(columns, [{ name: 'Tea', amount: 0 }, { name: 'Café, crème' }])).toBe(
			'Name,Amount\nTea,0\n"Café, crème",'
		);
	});
});
