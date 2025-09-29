import { getCartFromDb } from '$lib/server/cart';
import { collections, withTransaction } from '$lib/server/database.js';
import { createOrder } from '$lib/server/orders';
import { paymentMethods } from '$lib/server/payment-methods.js';
import { runtimeConfig } from '$lib/server/runtime-config';
import { userIdentifier } from '$lib/server/user.js';
import { omit } from '$lib/utils/omit';
import { error, redirect } from '@sveltejs/kit';
import { z } from 'zod';

export const load = async ({}) => {};

export const actions = {
	default: async ({ request, locals }) => {
		const formData = await request.formData();
		const methods = paymentMethods();
		const cart = await getCartFromDb({ user: userIdentifier(locals) });

		if (!cart?.items.length) {
			throw error(400, 'Cart is empty');
		}

		const products = await collections.products
			.find({
				_id: { $in: cart.items.map((item) => item.productId) }
			})
			.map((product) =>
				Object.assign(omit(product, 'translations'), product.translations?.[locals.language] ?? {})
			)
			.toArray();
		const paymentMethod = z
			.object({
				paymentMethod: z.enum([methods[0], ...methods.slice(1)])
			})
			.parse(Object.fromEntries(formData)).paymentMethod;
		const byId = Object.fromEntries(products.map((product) => [product._id, product]));

		let orderId = '';
		await withTransaction(async (session) => {
			orderId = await createOrder(
				cart.items.map((item) => ({
					quantity: item.quantity,
					product: byId[item.productId],
					...(item.customPrice && {
						customPrice: { amount: item.customPrice.amount, currency: item.customPrice.currency }
					}),
					...(item.chosenVariations && { chosenVariations: item.chosenVariations }),
					depositPercentage: item.depositPercentage
				})),
				paymentMethod,
				{
					locale: locals.language,
					user: {
						email: locals.email,
						npub: locals.npub,
						sessionId: locals.sessionId,
						userAlias: locals.user?.alias,
						userHasPosOptions: locals.user?.hasPosOptions,
						userId: locals.user?._id,
						userLogin: locals.user?.login,
						userRoleId: locals.user?.roleId
					},

					cart,
					shippingAddress: null,
					billingAddress: null,
					userVatCountry: locals.countryCode ?? (runtimeConfig.vatCountry || undefined),
					session
				}
			);
		});
		throw redirect(303, `/pos/customer-touch/payment/${orderId}`);
	}
};
