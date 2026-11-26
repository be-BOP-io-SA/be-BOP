import { getCartFromDb } from '$lib/server/cart';
import { checkoutPrices } from '$lib/server/checkoutPrices';
import { collections } from '$lib/server/database';
import { paymentMethods, restrictToProducts } from '$lib/server/payment-methods';
import { rateLimit } from '$lib/server/rateLimit';
import { userIdentifier } from '$lib/server/user';
import { json } from '@sveltejs/kit';
import { z } from 'zod';

/**
 * The checkout's discounts and free units again, for the address typed in its contact field.
 * Only the result travels back: the addresses a discount or a subscription is reserved to never
 * leave the server.
 */
export const POST = async ({ request, locals }) => {
	// Each answer says whether an address gets a discount, so it is not left open to scanning.
	rateLimit(locals.clientIp, 'checkout-prices', 60, { minutes: 5 });

	const { address } = z.object({ address: z.string().trim().max(200) }).parse(await request.json());

	const cart = await getCartFromDb({ user: userIdentifier(locals) });
	const products = await collections.products
		.find({ _id: { $in: cart.items.map((item) => item.productId) } })
		.toArray();
	const byId = new Map(products.map((product) => [product._id, product]));
	const items = cart.items.flatMap((item) => {
		const product = byId.get(item.productId);
		return product
			? [
					{
						product,
						quantity: item.quantity,
						...(item.customPrice && { customPrice: item.customPrice })
					}
			  ]
			: [];
	});

	const prices = await checkoutPrices({
		locals,
		items,
		promoCode: cart.promoCode,
		methods: restrictToProducts(
			paymentMethods({ hasPosOptions: locals.user?.hasPosOptions }),
			products
		),
		checkoutAddress: address
	});

	return json({
		discountByContext: prices.discountByContext,
		freeProductUnits: prices.freeProductUnits
	});
};
