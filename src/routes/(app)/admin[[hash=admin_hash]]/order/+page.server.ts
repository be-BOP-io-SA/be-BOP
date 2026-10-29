import { collections } from '$lib/server/database';
import { loadAllCheckoutFields } from '$lib/server/checkoutFields';
import { paymentMethods } from '$lib/server/payment-methods';
import { COUNTRY_ALPHA2S } from '$lib/types/Country.js';
import { type Order, ORDER_PAGINATION_LIMIT } from '$lib/types/Order';
import { CUSTOMER_ROLE_ID } from '$lib/types/User';
import { escapeForRegex } from '$lib/utils/escapeForRegex';
import { set } from '$lib/utils/set';

import type { Filter } from 'mongodb';
import type { JsonObject } from 'type-fest';
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
		posSubtype: z.string().optional(),
		customFields: z
			.array(z.object({ slug: z.string().trim(), value: z.string().trim() }))
			.optional()
			.default([])
	});

	const searchParams: JsonObject = {};
	for (const [key, value] of url.searchParams) {
		set(searchParams, key, value);
	}
	const result = querySchema.parse(searchParams);

	// A row left half empty filters nothing.
	const customFieldFilters = result.customFields.filter((filter) => filter.slug && filter.value);
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
		// One $elemMatch per row, so each row has to match its own answer.
		query.$and = customFieldFilters.map((filter) => ({
			customCheckoutFields: {
				$elemMatch: {
					slug: filter.slug,
					value: { $regex: `^${escapeForRegex(filter.value)}$`, $options: 'i' }
				}
			}
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
	const checkoutFields = await loadAllCheckoutFields();
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
		// An Address field answers with a whole address, which this filter cannot search yet (#2816).
		checkoutFields: checkoutFields
			.filter((field) => field.type !== 'address')
			.map((field) => ({ slug: field.slug, name: field.name, disabled: !!field.disabled })),
		customFieldFilters
	};
}
