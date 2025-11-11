import { collections } from '$lib/server/database';
import { countryFromIp } from '$lib/server/geoip';
import { pojo } from '$lib/server/pojo.js';
import { addDays, subDays, subMonths } from 'date-fns';
import { z } from 'zod';
import { paymentMethods } from '$lib/server/payment-methods';
import { CUSTOMER_ROLE_ID } from '$lib/types/User';
import type { Tag } from '$lib/types/Tag';

export async function load({ url }) {
	const methods = paymentMethods({ includePOS: true });

	const querySchema = z.object({
		beginsAt: z.date({ coerce: true }).default(subMonths(new Date(), 1)),
		endsAt: z.date({ coerce: true }).default(new Date()),
		paymentMethod: z.enum(['' as const, ...methods]).optional(),
		employeesAlias: z.string().array(),
		tagId: z.string().optional()
	});
	const queryParams = Object.fromEntries(url.searchParams.entries());
	const result = querySchema.parse({
		...queryParams,
		employeesAlias: url.searchParams.getAll('employeesAlias')
	});
	const { beginsAt, endsAt, paymentMethod, employeesAlias, tagId } = result;
	const aliasFilter = [];
	if (employeesAlias.includes('System')) {
		aliasFilter.push({ 'user.userAlias': { $exists: false } });
	}
	const otherAliases = employeesAlias.filter((alias) => alias !== 'System');
	if (otherAliases.length > 0) {
		aliasFilter.push({ 'user.userAlias': { $in: otherAliases } });
	}

	// Build tag filter for orders that contain products with the specified tag
	const tagFilter = tagId ? { 'items.product.tagIds': tagId } : {};

	const orders = await collections.orders
		.find({
			createdAt: {
				// Expand the search window a bit so that timezone differences between the client and the server do not impact the user's experience
				$gte: subDays(beginsAt, 1),
				$lt: addDays(endsAt, 1)
			},
			...(paymentMethod && { 'payments.method': paymentMethod }),
			...(aliasFilter.length > 0 && { $or: aliasFilter }),
			...tagFilter
		})
		.sort({ createdAt: -1 })
		.toArray();
	const nonCustomers = await collections.users
		.find({ roleId: { $ne: CUSTOMER_ROLE_ID } })
		.sort({ _id: 1 })
		.toArray();

	// Load tags that are available for reporting filter
	const reportingTags = await collections.tags
		.find({ reportingFilter: true })
		.project<Pick<Tag, '_id' | 'name'>>({ _id: 1, name: 1 })
		.sort({ name: 1 })
		.toArray();

	const posSubtypes = await collections.posPaymentSubtypes.find({}).toArray();

	return {
		orders: orders.map((order) => ({
			_id: order._id.toString(),
			payments: order.payments.map((payment) => ({
				...pojo(payment),
				id: payment._id.toString(),
				posSubtype: payment.posSubtype
			})),
			number: order.number,
			createdAt: order.createdAt,
			currencySnapshot: order.currencySnapshot,
			status: order.status,
			items: order.items.map((item) => ({
				...item,
				_id: item._id?.toString(),
				product: {
					...item.product,
					vatProfileId: item.product.vatProfileId?.toString()
				}
			})),
			billingAddress: order.billingAddress,
			shippingAddress: order.shippingAddress,
			ipCountry: countryFromIp(order.clientIp ?? ''),
			vat: order.vat
		})),
		beginsAt,
		endsAt,
		paymentMethods: methods,
		paymentMethod,
		employees: nonCustomers.map((user) => ({
			_id: user._id.toString(),
			alias: user.alias
		})),
		employeesAlias,
		reportingTags,
		tagId,
		posSubtypes: posSubtypes.map((subtype) => ({
			slug: subtype.slug,
			name: subtype.name
		}))
	};
}
