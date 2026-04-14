import { checkCartItems } from '$lib/server/cart';
import { cmsFromContent } from '$lib/server/cms';
import { collections, withTransaction } from '$lib/server/database';
import { findActivePromoDiscount, hasAnyActivePromoDiscount } from '$lib/server/discount';
import { applyResolvedStock, refreshAvailableStockInDb } from '$lib/server/product.js';
import { rateLimit } from '$lib/server/rateLimit';
import { runtimeConfig } from '$lib/server/runtime-config.js';
import { userIdentifier, userQuery } from '$lib/server/user.js';
import { CUSTOMER_ROLE_ID } from '$lib/types/User';
import { error, fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';

export async function load({ parent, locals }) {
	if (
		runtimeConfig.hideCartInToolbar &&
		(locals.user?.roleId === undefined || locals.user.roleId === CUSTOMER_ROLE_ID)
	) {
		throw error(403, 'This page is not accessible ');
	}

	const parentData = await parent();

	// Resolve stock for cart items FIRST (needed for checkCartItems)
	const cartItemsWithResolvedStock = await Promise.all(
		parentData.cart.items.map(async (item) => ({
			...item,
			product: await applyResolvedStock(item.product)
		}))
	);

	if (parentData.cart) {
		try {
			await checkCartItems(cartItemsWithResolvedStock, { user: userIdentifier(locals) });
		} catch (err) {
			if (
				typeof err === 'object' &&
				err &&
				'body' in err &&
				typeof err.body === 'object' &&
				err.body &&
				'message' in err.body &&
				typeof err.body.message === 'string'
			) {
				return { errorMessage: err.body.message };
			}
		}
	}

	const [cmsBasketTop, cmsBasketBottom] = await Promise.all([
		collections.cmsPages.findOne(
			{
				_id: 'cart-top'
			},
			{
				projection: {
					content: { $ifNull: [`$translations.${locals.language}.content`, '$content'] },
					employeeContent: {
						$ifNull: [`$translations.${locals.language}.employeeContent`, '$employeeContent']
					},
					hasEmployeeContent: 1,
					title: { $ifNull: [`$translations.${locals.language}.title`, '$title'] },
					shortDescription: {
						$ifNull: [`$translations.${locals.language}.shortDescription`, '$shortDescription']
					},
					fullScreen: 1,
					maintenanceDisplay: 1
				}
			}
		),
		collections.cmsPages.findOne(
			{
				_id: 'cart-bottom'
			},
			{
				projection: {
					content: { $ifNull: [`$translations.${locals.language}.content`, '$content'] },
					employeeContent: {
						$ifNull: [`$translations.${locals.language}.employeeContent`, '$employeeContent']
					},
					hasEmployeeContent: 1,
					title: { $ifNull: [`$translations.${locals.language}.title`, '$title'] },
					shortDescription: {
						$ifNull: [`$translations.${locals.language}.shortDescription`, '$shortDescription']
					},
					fullScreen: 1,
					maintenanceDisplay: 1
				}
			}
		)
	]);
	const forceContentVersion =
		locals.user?.roleId !== undefined && locals.user?.roleId !== CUSTOMER_ROLE_ID
			? 'employee'
			: undefined;

	// Only show promo input if any active discount actually uses a promo code
	const hasPromoDiscounts = await hasAnyActivePromoDiscount();

	// Get the applied promo code from the cart in DB
	const cartInDb = await collections.carts.findOne(userQuery(userIdentifier(locals)), {
		projection: { promoCode: 1 }
	});

	return {
		cart: {
			...parentData.cart,
			items: cartItemsWithResolvedStock
		},
		hasPromoDiscounts,
		appliedPromoCode: cartInDb?.promoCode,
		...(cmsBasketTop && {
			cmsBasketTop,
			cmsBasketTopData: cmsFromContent(
				{
					desktopContent: cmsBasketTop.content,
					employeeContent:
						(cmsBasketTop?.hasEmployeeContent && cmsBasketTop.employeeContent) || undefined,
					forceContentVersion
				},
				locals
			)
		}),
		...(cmsBasketBottom && {
			cmsBasketBottom,
			cmsBasketBottomData: cmsFromContent(
				{
					desktopContent: cmsBasketBottom.content,
					employeeContent:
						(cmsBasketBottom?.hasEmployeeContent && cmsBasketBottom.employeeContent) || undefined,
					forceContentVersion
				},
				locals
			)
		})
	};
}
export const actions = {
	applyPromoCode: async ({ request, locals }) => {
		try {
			rateLimit(locals.clientIp, 'promo-code', 20, { hours: 3 });
		} catch (e) {
			// rateLimit only throws SvelteKit error(429, ...) — log abuse and return form fail
			const status = (e as { status?: unknown })?.status;
			if (status === 429) {
				console.warn('Promo code rate limit hit', { clientIp: locals.clientIp });
				return fail(429, { promoRateLimited: true });
			}
			throw e;
		}

		const formData = await request.formData();
		const parsed = z.string().min(1).max(50).safeParse(formData.get('promoCode'));
		if (!parsed.success) {
			console.warn('Invalid promo code payload', { clientIp: locals.clientIp });
			return fail(400, { promoError: true });
		}

		const exists = await findActivePromoDiscount(parsed.data);
		if (!exists) {
			return fail(400, { promoError: true });
		}

		await collections.carts.updateOne(userQuery(userIdentifier(locals)), {
			$set: { promoCode: parsed.data, updatedAt: new Date() }
		});

		return { promoSuccess: true, promoCode: parsed.data };
	},

	removePromoCode: async ({ locals }) => {
		await collections.carts.updateOne(userQuery(userIdentifier(locals)), {
			$unset: { promoCode: '' },
			$set: { updatedAt: new Date() }
		});
		return { promoRemoved: true };
	},

	removeAll: async ({ locals, request }) => {
		const cart = await collections.carts.findOne(userQuery(userIdentifier(locals)));
		if (!cart) {
			throw error(404, 'Cart not found');
		}

		cart.items = [];

		await withTransaction(async (session) => {
			await collections.carts.updateOne(
				{ _id: cart._id },
				{ $set: { items: cart.items, updatedAt: new Date() } },
				{ session }
			);

			// Refresh available stock for all products in the cart
			for (const item of cart.items) {
				await refreshAvailableStockInDb(item.productId, session);
			}
		});

		throw redirect(303, request.headers.get('referer') || '/cart');
	}
};
