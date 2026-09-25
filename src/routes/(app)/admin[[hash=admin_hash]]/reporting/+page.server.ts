import { collections } from '$lib/server/database';
import { paymentMethods } from '$lib/server/payment-methods';
import {
	computeReportingSynthesis,
	fetchReportingOrders,
	paginate,
	parseReportingFilters,
	selectOrderDetail,
	selectPaymentDetail,
	selectProductDetail,
	toOrderRow,
	toPaymentRow,
	toProductRow
} from '$lib/server/reporting';
import { runtimeConfig } from '$lib/server/runtime-config';
import { CUSTOMER_ROLE_ID, type User } from '$lib/types/User';
import type { PosPaymentSubtype } from '$lib/types/PosPaymentSubtype';
import type { Tag } from '$lib/types/Tag';

function pageParam(url: URL, name: string) {
	return Number(url.searchParams.get(name)) || 1;
}

export async function load({ url }) {
	const methods = paymentMethods({ includePOS: true });
	const filters = parseReportingFilters(url, methods);

	const [orders, nonCustomers, reportingTags, posSubtypes] = await Promise.all([
		fetchReportingOrders(filters),
		collections.users
			.find({ roleId: { $ne: CUSTOMER_ROLE_ID } })
			.project<Pick<User, '_id' | 'alias'>>({ alias: 1 })
			.sort({ _id: 1 })
			.toArray(),
		collections.tags
			.find({ reportingFilter: true })
			.project<Pick<Tag, '_id' | 'name'>>({ _id: 1, name: 1 })
			.sort({ name: 1 })
			.toArray(),
		collections.posPaymentSubtypes
			.find({})
			.project<Pick<PosPaymentSubtype, 'slug' | 'name'>>({ slug: 1, name: 1 })
			.toArray()
	]);

	const orderDetail = paginate(selectOrderDetail(orders, filters), pageParam(url, 'ordersPage'));
	const productDetail = paginate(
		selectProductDetail(orders, filters),
		pageParam(url, 'productsPage')
	);
	const paymentDetail = paginate(
		selectPaymentDetail(orders, filters),
		pageParam(url, 'paymentsPage')
	);

	return {
		filters,
		synthesis: computeReportingSynthesis(orders, filters, runtimeConfig.mainCurrency),
		orderDetail: { ...orderDetail, rows: orderDetail.rows.map(toOrderRow) },
		productDetail: { ...productDetail, rows: productDetail.rows.map(toProductRow) },
		paymentDetail: { ...paymentDetail, rows: paymentDetail.rows.map(toPaymentRow) },
		paymentMethods: methods,
		employees: nonCustomers.map((user) => ({
			_id: user._id.toString(),
			alias: user.alias
		})),
		reportingTags,
		posSubtypes: posSubtypes.map((subtype) => ({
			slug: subtype.slug,
			name: subtype.name
		}))
	};
}
