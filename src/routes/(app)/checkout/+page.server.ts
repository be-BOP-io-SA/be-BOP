import { collections } from '$lib/server/database';
import { paymentMethods } from '$lib/server/payment-methods';
import { COUNTRY_ALPHA2S } from '$lib/types/Country';
import { error, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { createOrder } from '$lib/server/orders';
import { emailsEnabled } from '$lib/server/email';
import { runtimeConfig } from '$lib/server/runtime-config';
import { vatRates } from '$lib/server/vat-rates';
import { checkCartItems, getCartFromDb } from '$lib/server/cart.js';
import { userIdentifier } from '$lib/server/user.js';
import { POS_ROLE_ID } from '$lib/types/User.js';
import { zodNpub } from '$lib/server/nostr.js';

export async function load({ parent, locals }) {
	const parentData = await parent();

	if (parentData.cart) {
		try {
			await checkCartItems(parentData.cart, { user: userIdentifier(locals) });
		} catch (err) {
			throw redirect(303, '/cart');
		}
	}
	return {
		paymentMethods: paymentMethods(locals.user?.roleId),
		emailsEnabled,
		deliveryFees: runtimeConfig.deliveryFees,
		vatRates: Object.fromEntries(COUNTRY_ALPHA2S.map((country) => [country, vatRates[country]])),
		collectIPOnDeliverylessOrders: runtimeConfig.collectIPOnDeliverylessOrders
	};
}

export const actions = {
	default: async ({ request, locals }) => {
		const methods = paymentMethods(locals.user?.roleId);
		if (!methods.length) {
			throw error(500, 'No payment methods configured for the bootik');
		}
		const cart = await getCartFromDb({ user: userIdentifier(locals) });

		if (!cart?.items.length) {
			throw error(400, 'Cart is empty');
		}

		const products = await collections.products
			.find({
				_id: { $in: cart.items.map((item) => item.productId) }
			})
			.toArray();

		const byId = Object.fromEntries(products.map((product) => [product._id, product]));

		cart.items = cart.items.filter((item) => !!byId[item.productId]);

		if (!cart?.items.length) {
			throw error(400, 'Cart is empty');
		}

		const formData = await request.formData();

		const isDigital = products.every((product) => !product.shipping);

		const shipping = isDigital
			? null
			: z
					.object({
						firstName: z.string().min(1),
						lastName: z.string().min(1),
						address: z.string().min(1),
						city: z.string().min(1),
						state: z.string().optional(),
						zip: z.string().min(1),
						country: z.enum(COUNTRY_ALPHA2S)
					})
					.parse(Object.fromEntries(formData));

		const notifications = z
			.object({
				paymentStatusNPUB: zodNpub().optional(),
				paymentStatusEmail: z.string().email().optional()
			})
			.parse({
				paymentStatusNPUB: formData.get('paymentStatusNPUB') || undefined,
				paymentStatusEmail: formData.get('paymentStatusEmail') || undefined
			});

		const npubAddress = notifications?.paymentStatusNPUB;
		const email = notifications?.paymentStatusEmail;

		// Remove empty string
		if (shipping && !shipping.state) {
			delete shipping.state;
		}

		const { paymentMethod, discountAmount, discountType, discountJustification } = z
			.object({
				paymentMethod: z.enum([methods[0], ...methods.slice(1)]),
				discountAmount: z.coerce.number().optional(),
				discountType: z.enum(['fiat', 'percentage']).optional(),
				discountJustification: z.string().optional()
			})
			.parse(Object.fromEntries(formData));

		if (discountAmount && (!discountType || !discountJustification)) {
			throw error(400, 'Discount type and justification are required');
		}

		let isFreeVat: boolean | undefined;
		let reasonFreeVat: string | undefined;

		if (locals.user?.roleId === POS_ROLE_ID) {
			const vatDetails = z
				.object({
					isFreeVat: z.coerce.boolean().optional(),
					reasonFreeVat: z.string().optional()
				})
				.parse(Object.fromEntries(formData));

			isFreeVat = vatDetails.isFreeVat;
			reasonFreeVat = vatDetails.reasonFreeVat;
		}

		if (isFreeVat && !reasonFreeVat) {
			throw error(400, 'Reason for free VAT is required');
		}

		const collectIP = z
			.object({
				allowCollectIP: z.boolean({ coerce: true }).default(false)
			})
			.parse({
				allowCollectIP: formData.get('allowCollectIP')
			});

		const orderId = await createOrder(
			cart.items.map((item) => ({
				quantity: item.quantity,
				product: byId[item.productId],
				...(item.customPrice && {
					customPrice: { amount: item.customPrice.amount, currency: item.customPrice.currency }
				})
			})),
			paymentMethod,
			{
				user: {
					sessionId: locals.sessionId,
					userId: locals.user?._id,
					userLogin: locals.user?.login,
					userRoleId: locals.user?.roleId
				},
				notifications: {
					paymentStatus: {
						npub: npubAddress,
						email
					}
				},
				cart,
				shippingAddress: shipping,
				vatCountry: shipping?.country ?? locals.countryCode,
				...(locals.user?.roleId === POS_ROLE_ID && isFreeVat && { reasonFreeVat }),
				...(locals.user?.roleId === POS_ROLE_ID &&
					discountAmount &&
					discountType &&
					discountJustification && {
						discount: {
							amount: discountAmount,
							type: discountType,
							justification: discountJustification
						}
					}),
				...(collectIP.allowCollectIP && { clientIp: locals.clientIp })
			}
		);

		throw redirect(303, `/order/${orderId}`);
	}
};
