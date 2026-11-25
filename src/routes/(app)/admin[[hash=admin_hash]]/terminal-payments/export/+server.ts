import { error } from '@sveltejs/kit';
import { z } from 'zod';
import {
	POS_EXPORT_FORMATS,
	posExportEntries,
	toBai2,
	toCamt053,
	toCamt054,
	toCfonb120,
	toCsv
} from '$lib/server/pos-exports';

/** A reconciliation export of the terminal payments paid in a period, in the chosen format. */
export async function GET({ url }) {
	const parsed = z
		.object({
			format: z.enum(POS_EXPORT_FORMATS),
			from: z.date({ coerce: true }),
			to: z.date({ coerce: true })
		})
		.safeParse(Object.fromEntries(url.searchParams));
	if (!parsed.success) {
		throw error(400, 'Choose a format and a period');
	}
	// Both ends are taken to the second, as chosen.
	const { format, from, to } = parsed.data;
	const entries = await posExportEntries(from, to);
	const stampOf = (date: Date) => date.toISOString().slice(0, 19).replace(/:/g, '-');
	const stamp = `${stampOf(from)}_${stampOf(to)}`;

	const files = {
		csv: () => ({ body: toCsv(entries), type: 'text/csv; charset=utf-8', ext: 'csv' }),
		camt053: () => ({ body: toCamt053(entries, from, to), type: 'application/xml', ext: 'xml' }),
		camt054: () => ({ body: toCamt054(entries, from, to), type: 'application/xml', ext: 'xml' }),
		cfonb120: () => ({
			body: toCfonb120(entries, from, to),
			type: 'text/plain; charset=utf-8',
			ext: 'txt'
		}),
		bai2: () => ({ body: toBai2(entries, to), type: 'text/plain; charset=utf-8', ext: 'bai' })
	};
	const file = files[format]();

	return new Response(file.body, {
		headers: {
			'Content-Type': file.type,
			'Content-Disposition': `attachment; filename=terminal-payments-${format}-${stamp}.${file.ext}`
		}
	});
}
