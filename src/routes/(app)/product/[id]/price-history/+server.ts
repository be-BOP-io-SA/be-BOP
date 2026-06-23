import { collections } from '$lib/server/database';
import { getProductPriceHistory } from '$lib/server/price-history';
import { rateLimit } from '$lib/server/rateLimit';
import { runtimeConfig } from '$lib/server/runtime-config';
import { CUSTOMER_ROLE_ID } from '$lib/types/User';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const RANGE_DAYS: Record<string, number | null> = {
	'1m': 30,
	'1y': 365,
	'5y': 1825,
	all: null
};

function escapeCSV(value: string): string {
	// Prefix formula-trigger characters to prevent spreadsheet injection.
	const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
	return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export const GET: RequestHandler = async ({ params, locals, url }) => {
	if (!runtimeConfig.priceHistoryEnabled) {
		throw error(404, 'Price history is disabled');
	}

	// Public read endpoint — keep it cheap to abuse.
	rateLimit(locals.clientIp, 'price-history', 60, { minutes: 1 });

	const product = await collections.products.findOne(
		{ _id: params.id },
		{ projection: { price: 1, payWhatYouWant: 1, free: 1, bookingSpec: 1 } }
	);
	if (!product) {
		throw error(404, 'Product not found');
	}
	// No fixed catalogue price for these products — the calendar is not available.
	if (product.payWhatYouWant || product.free || product.bookingSpec) {
		throw error(404, 'Price history not available for this product');
	}

	const isStaff = locals.user?.roleId !== undefined && locals.user.roleId !== CUSTOMER_ROLE_ID;
	const isCsv = url.searchParams.get('format') === 'csv';
	if (isCsv && !isStaff) {
		throw error(403, 'Forbidden');
	}

	// JSON charts are bounded to the selected window (default 1 month) to limit how
	// many orders are scanned; the CSV export covers the full history for auditors.
	const rangeParam = url.searchParams.get('range') ?? '1m';
	const windowDays = isCsv ? null : rangeParam in RANGE_DAYS ? RANGE_DAYS[rangeParam] : 30;
	const history = await getProductPriceHistory(params.id, product.price.currency, windowDays);

	if (isCsv) {
		const header = 'series,date,price,currency';
		const rows = [
			...history.catalogue.points.map((p) =>
				['catalogue', p.t, String(p.price), history.currency].map(escapeCSV).join(',')
			),
			...history.paid.points.map((p) =>
				['average_paid', p.t, String(p.price), history.currency].map(escapeCSV).join(',')
			)
		];
		const csv = [header, ...rows].join('\n');
		return new Response(csv, {
			headers: {
				'content-type': 'text/csv; charset=utf-8',
				'content-disposition': `attachment; filename="price-history-${params.id}.csv"`
			}
		});
	}

	// Gate average-paid aggregate to staff — it's business-sensitive.
	const payload = isStaff
		? history
		: { ...history, paid: { points: [], mean: null, pctBelowCatalogue: null } };

	return json(payload, { headers: { 'Cache-Control': 'public, max-age=60' } });
};
