import { format, differenceInDays, isSameDay } from 'date-fns';

/**
 *   [Jan 1] → "1 Jan 2025"
 *   [Jan 1, Jan 2, Jan 3] → "1-3 Jan 2025"
 *   [Jan 1, Jan 2, Jan 5] → "1-2 Jan, 5 Jan 2025"
 *   [Dec 30, Dec 31, Jan 1] → "30-31 Dec 2024, 1 Jan 2025"
 */
export function formatBookedDates(dates: (Date | string)[]): string {
	if (!dates.length) {
		return '';
	}
	const parsed = dates.map((date) => (typeof date === 'string' ? new Date(date) : date));
	if (parsed.length === 1) {
		return format(parsed[0], 'd MMM yyyy');
	}

	return parsed
		.reduce<Array<{ start: Date; end: Date }>>((ranges, date) => {
			const last = ranges.at(-1);
			last && differenceInDays(date, last.end) === 1
				? (last.end = date)
				: ranges.push({ start: date, end: date });
			return ranges;
		}, [])
		.map((range, idx, arr) => {
			const fmt = idx === arr.length - 1 ? 'd MMM yyyy' : 'd MMM';
			return isSameDay(range.start, range.end)
				? format(range.start, fmt)
				: `${format(range.start, 'd')}-${format(range.end, fmt)}`;
		})
		.join(', ');
}
