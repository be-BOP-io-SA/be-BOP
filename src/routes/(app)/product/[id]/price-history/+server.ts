import { collections } from '$lib/server/database';
import { getProductPriceHistory } from '$lib/server/price-history';
import { isVisibleToViewer } from '$lib/server/product-visibility';
import { rateLimit } from '$lib/server/rateLimit';
import { runtimeConfig } from '$lib/server/runtime-config';
import { isAllowedOnPage } from '$lib/types/Role';
import { CUSTOMER_ROLE_ID } from '$lib/types/User';
import { csvCell } from '$lib/utils/csvCell';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const RANGE_DAYS: Record<string, number | null> = {
	'1m': 30,
	'1y': 365,
	'5y': 1825,
	all: null
};

export const GET: RequestHandler = async ({ params, locals, url }) => {
	if (!runtimeConfig.priceHistoryEnabled) {
		throw error(404, 'Price history is disabled');
	}

	// Public read endpoint — keep it cheap to abuse.
	rateLimit(locals.clientIp, 'price-history', 60, { minutes: 1 });

	const product = await collections.products.findOne(
		{ _id: params.id },
		{ projection: { price: 1, payWhatYouWant: 1, free: 1, bookingSpec: 1, actionSettings: 1 } }
	);
	// The admin price-history tab reads this endpoint for products the shop does not show yet.
	const canReadAdminProduct =
		!!locals.user?.role && isAllowedOnPage(locals.user.role, `/admin/product/${params.id}`, 'read');
	// The product page redirects away from hidden products; their prices must not leak from here.
	if (!product || (!canReadAdminProduct && !isVisibleToViewer(product, locals))) {
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
				['catalogue', p.t, p.price, history.currency].map(csvCell).join(',')
			),
			...history.paid.points.map((p) =>
				['average_paid', p.t, p.price, history.paid.currency].map(csvCell).join(',')
			)
		];
		const csv = [header, ...rows].join('\n');
		return new Response(csv, {
			headers: {
				'cache-control': 'private',
				'content-type': 'text/csv; charset=utf-8',
				'content-disposition': `attachment; filename="price-history-${params.id}.csv"`
			}
		});
	}

	// Gate average-paid aggregate to staff — it's business-sensitive. Keep the currency so the
	// client shape stays stable; blank out the actual figures.
	const payload = isStaff
		? history
		: {
				...history,
				paid: {
					currency: history.paid.currency,
					points: [],
					listPoints: [],
					mean: null,
					pctBelowCatalogue: null
				}
		  };

	// Staff get figures and hidden products a shared cache must not hand to the next visitor.
	const cacheControl =
		isStaff || canReadAdminProduct ? 'private, max-age=60' : 'public, max-age=60';
	// The body depends on who is signed in, so a shared cache keys its public copy on the cookie.
	return json(payload, { headers: { 'Cache-Control': cacheControl, Vary: 'Cookie' } });
};
