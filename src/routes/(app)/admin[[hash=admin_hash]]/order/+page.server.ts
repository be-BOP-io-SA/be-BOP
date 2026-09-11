import { collections } from '$lib/server/database';
import { loadEnabledCheckoutFields } from '$lib/server/checkoutFields';
import { paymentMethods } from '$lib/server/payment-methods';
import { COUNTRY_ALPHA2S } from '$lib/types/Country.js';
import { type Order, ORDER_PAGINATION_LIMIT } from '$lib/types/Order';
import { CUSTOMER_ROLE_ID } from '$lib/types/User';

import type { Filter } from 'mongodb';
import { z } from 'zod';

export async function load({ url, locals }) {
	const methods = paymentMethods({ hasPosOptions: locals.user?.hasPosOptions, includePOS: true });

	const querySchema = z.object({
		skip: z.number({ coerce: true }).int().min(0).optional().default(0),
		orderNumber: z.number({ coerce: true }).int().min(0).optional(),
		productAlias: z.string().optional(),
		paymentMethod: z.enum(['' as const, ...methods]).optional(),
		country: z.enum(['' as const, ...COUNTRY_ALPHA2S]).optional(),
		email: z.string().optional(),
		label: z.string().optional(),
		npub: z.string().optional(),
		employeeAlias: z.string().optional(),
		posSubtype: z.string().optional()
	});

	const searchParams = Object.fromEntries(url.searchParams.entries());
	const result = querySchema.parse(searchParams);

	// Read before the single-value parse above would flatten them: a filter row is a (slug, value)
	// pair, and there can be several. Rows are paired by position, and an empty value drops its row
	// rather than matching every order that carries the field.
	const customFieldSlugs = url.searchParams.getAll('customFieldSlug');
	const customFieldValues = url.searchParams.getAll('customFieldValue');
	const customFieldFilters = customFieldSlugs
		.map((slug, index) => ({ slug: slug.trim(), value: (customFieldValues[index] ?? '').trim() }))
		.filter((filter) => filter.slug && filter.value);
	const {
		skip,
		orderNumber,
		productAlias,
		paymentMethod,
		country,
		email,
		npub,
		label,
		employeeAlias,
		posSubtype
	} = result;

	const query: Filter<Order> = {};

	if (orderNumber) {
		query.number = orderNumber;
	}
	if (productAlias) {
		query['items.product.alias'] = productAlias;
	}
	if (paymentMethod) {
		query['payments.method'] = paymentMethod;
	}
	if (posSubtype) {
		query['payments.posSubtype'] = posSubtype;
	}
	if (country) {
		query['shippingAddress.country'] = country;
	}
	if (email) {
		query['user.email'] = email;
	}
	if (npub) {
		query['user.npub'] = npub;
	}
	if (label) {
		query['orderLabelIds'] = label;
	}
	if (customFieldFilters.length) {
		// One $elemMatch per row: two filters must be satisfied by two different entries of the
		// array, which a flat 'customCheckoutFields.slug' + '.value' pair would not guarantee.
		query.$and = customFieldFilters.map((filter) => ({
			customCheckoutFields: { $elemMatch: { slug: filter.slug, value: filter.value } }
		}));
	}

	if (employeeAlias === 'System') {
		query['user.userAlias'] = { $exists: false };
	} else if (employeeAlias) {
		query['user.userAlias'] = employeeAlias;
	}

	const orders = await collections.orders
		.find(query)
		.skip(skip)
		.limit(ORDER_PAGINATION_LIMIT)
		.sort({ createdAt: -1 })
		.toArray();
	const labels = await collections.labels.find({}).toArray();
	const posSubtypes = await collections.posPaymentSubtypes
		.find({})
		.sort({ sortOrder: 1 })
		.toArray();
	const checkoutFields = await loadEnabledCheckoutFields();
	const nonCustomers = await collections.users
		.find({ roleId: { $ne: CUSTOMER_ROLE_ID } })
		.sort({ _id: 1 })
		.toArray();
	return {
		orders: orders.map((order) => ({
			_id: order._id,
			payments: order.payments.map((payment) => ({
				id: payment._id.toString(),
				status: payment.status,
				method: payment.method,
				...(payment.customPaymentMethod && {
					customPaymentMethod: { label: payment.customPaymentMethod.label }
				})
			})),
			number: order.number,
			createdAt: order.createdAt,
			currencySnapshot: order.currencySnapshot,
			notes:
				order.notes?.map((note) => ({
					content: note.content,
					createdAt: note.createdAt
				})) || [],
			status: order.status,
			orderLabelIds: order.orderLabelIds
		})),
		paymentMethods: methods,
		labels,
		employees: nonCustomers.map((user) => ({
			_id: user._id.toString(),
			alias: user.alias
		})),
		posSubtype,
		posSubtypes: posSubtypes.map((s) => ({ slug: s.slug, name: s.name })),
		checkoutFields: checkoutFields.map((field) => ({ slug: field.slug, label: field.label })),
		customFieldFilters
	};
}
