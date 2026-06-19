import { collections } from '$lib/server/database';
import { getProductPriceHistory } from '$lib/server/price-history';
import { rateLimit } from '$lib/server/rateLimit';
import { CUSTOMER_ROLE_ID } from '$lib/types/User';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

function escapeCSV(value: string): string {
	return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export const GET: RequestHandler = async ({ params, locals, url }) => {
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

	const history = await getProductPriceHistory(params.id, product.price.currency);

	if (url.searchParams.get('format') === 'csv') {
		// CSV export is for staff (employees/admins) only — for auditors.
		const isStaff =
			locals.user?.roleId !== undefined && locals.user.roleId !== CUSTOMER_ROLE_ID;
		if (!isStaff) {
			throw error(403, 'Forbidden');
		}
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

	return json(history);
};
