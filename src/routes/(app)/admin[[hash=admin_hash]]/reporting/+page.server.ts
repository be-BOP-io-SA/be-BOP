import { collections } from '$lib/server/database';
import { countryFromIp } from '$lib/server/geoip';
import { sum } from '$lib/utils/sum';
import { pojo } from '$lib/server/pojo.js';
import { addDays, subDays, subMonths } from 'date-fns';
import { z } from 'zod';
import { paymentMethods } from '$lib/server/payment-methods';
import { CUSTOMER_ROLE_ID } from '$lib/types/User';

export async function load({ url }) {
	const methods = paymentMethods({ includePOS: true });

	const querySchema = z.object({
		beginsAt: z.date({ coerce: true }).default(subMonths(new Date(), 1)),
		endsAt: z.date({ coerce: true }).default(new Date()),
		paymentMethod: z.enum(['' as const, ...methods]).optional(),
		employeesAlias: z.string().array()
	});
	const queryParams = Object.fromEntries(url.searchParams.entries());
	const result = querySchema.parse({
		...queryParams,
		employeesAlias: url.searchParams.getAll('employeesAlias')
	});
	const { beginsAt, endsAt, paymentMethod, employeesAlias } = result;
	const aliasFilter = [];
	if (employeesAlias.includes('System')) {
		aliasFilter.push({ 'user.userAlias': { $exists: false } });
	}
	const otherAliases = employeesAlias.filter((alias) => alias !== 'System');
	if (otherAliases.length > 0) {
		aliasFilter.push({ 'user.userAlias': { $in: otherAliases } });
	}
	const orders = await collections.orders
		.find({
			createdAt: {
				// Expand the search window a bit so that timezone differences between the client and the server do not impact the user's experience
				$gte: subDays(beginsAt, 1),
				$lt: addDays(endsAt, 1)
			},
			...(paymentMethod && { 'payments.method': paymentMethod }),
			...(aliasFilter.length > 0 && { $or: aliasFilter })
			...(employeeAlias && employeeAlias === 'System' && { 'user.userAlias': { $exists: false } }),
			...(employeeAlias && employeeAlias !== 'System' && { 'user.userAlias': employeeAlias })
		})
		.sort({ createdAt: -1 })
		.toArray();
	const nonCustomers = await collections.users
		.find({ roleId: { $ne: CUSTOMER_ROLE_ID } })
		.sort({ _id: 1 })
		.toArray();
	return {
		orders: orders.map((order) => ({
			_id: order._id,
			payments: order.payments.map((payment) => ({
				...pojo(payment),
				id: payment._id.toString()
			})),
			number: order.number,
			createdAt: order.createdAt,
			currencySnapshot: order.currencySnapshot,
			status: order.status,
			items: order.items.map((item) => ({
				...item,
				product: {
					...item.product,
					vatProfileId: item.product.vatProfileId?.toString()
				}
			})),
			quantityOrder: sum(order.items.map((items) => items.quantity)),
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
		employeesAlias
	};
}
