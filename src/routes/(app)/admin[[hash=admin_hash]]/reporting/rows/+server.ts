import { error } from '@sveltejs/kit';
import { stringify } from 'devalue';
import { paymentMethods } from '$lib/server/payment-methods';
import {
	fetchReportingOrders,
	parseReportingFilters,
	selectOrderDetail,
	selectPaymentDetail,
	selectProductDetail,
	selectReceipts,
	toOrderRow,
	toPaymentRow,
	toProductRow
} from '$lib/server/reporting';

/** Unpaginated rows for the CSV, JSON and receipt exports, fetched only when the admin asks. */
export async function GET({ url }) {
	const filters = parseReportingFilters(url, paymentMethods({ includePOS: true }));
	const orders = await fetchReportingOrders(filters);

	return devalueResponse(rowsFor(url.searchParams.get('table')));

	function rowsFor(table: string | null) {
		switch (table) {
			case 'orders':
				return selectOrderDetail(orders, filters).map(toOrderRow);
			case 'products':
				return selectProductDetail(orders, filters).map(toProductRow);
			case 'payments':
				return selectPaymentDetail(orders, filters).map(toPaymentRow);
			case 'receipts':
				return selectReceipts(orders, filters);
			default:
				throw error(400, 'Unknown table');
		}
	}
}

// devalue keeps Date instances, so the page formats export rows exactly like page data rows.
function devalueResponse(value: unknown) {
	return new Response(stringify(value), { headers: { 'content-type': 'application/json' } });
}
