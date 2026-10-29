/** One definition drives both the paginated table cell and the full CSV export. */
export interface ReportingColumn<Row> {
	header: string;
	cell: (row: Row) => string | number | undefined;
	href?: (row: Row) => string;
	title?: (row: Row) => string | undefined;
}

function csvCell(value: string) {
	return /[",\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

/**
 * The text of a rendered table cell as the admin reads it. innerText would do this only while
 * the table is visible: on a collapsed one it returns the markup's raw newlines and indentation.
 */
export function cellText(cell: Pick<Element, 'textContent'>) {
	return (cell.textContent ?? '').replace(/\s+/g, ' ').trim();
}

export function toCsv(header: string[], rows: string[][]) {
	return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
}

export function columnsToCsv<Row>(columns: ReportingColumn<Row>[], rows: Row[]) {
	return toCsv(
		columns.map((column) => column.header),
		rows.map((row) => columns.map((column) => String(column.cell(row) ?? '')))
	);
}
