import { getCartFromDb } from '$lib/server/cart';
import { collections, withTransaction } from '$lib/server/database.js';
import { createOrder } from '$lib/server/orders';
import { paymentMethods } from '$lib/server/payment-methods.js';
import { runtimeConfig } from '$lib/server/runtime-config';
import { userIdentifier } from '$lib/server/user.js';
import { omit } from '$lib/utils/omit';
import { error, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { toSatoshis } from '$lib/utils/toSatoshis.js';

export const load = async ({ locals }) => {
	const cart = await getCartFromDb({ user: userIdentifier(locals) });

	// If cart is empty, redirect to home
	if (!cart?.items.length) {
		throw redirect(303, '/pos/customer-touch/list/home');
	}

	// Calculate total to determine if it's a free order
	const products = await collections.products
		.find({
			_id: { $in: cart.items.map((item) => item.productId) }
		})
		.toArray();

	const totalSatoshis = cart.items.reduce((sum, item) => {
		const product = products.find((p) => p._id === item.productId);
		if (!product) return sum;
		const price = item.customPrice?.amount ?? product.price.amount;
		return sum + toSatoshis(price * item.quantity, item.customPrice?.currency ?? product.price.currency);
	}, 0);

	const methods = paymentMethods({ totalSatoshis });

	return {
		isFreeOrder: totalSatoshis === 0,
		paymentMethods: methods
	};
};

export const actions = {
	default: async ({ request, locals }) => {
		const formData = await request.formData();
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

		// Calculate total to determine valid payment methods
		const totalSatoshis = cart.items.reduce((sum, item) => {
			const product = products.find((p) => p._id === item.productId);
			if (!product) return sum;
			const price = item.customPrice?.amount ?? product.price.amount;
			return sum + toSatoshis(price * item.quantity, item.customPrice?.currency ?? product.price.currency);
		}, 0);

		const methods = paymentMethods({ totalSatoshis });
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
					notifications: {
						paymentStatus: {
							email: runtimeConfig.sellerIdentity?.contact.email
						}
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
