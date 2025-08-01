import { checkCartItems } from '$lib/server/cart';
import { cmsFromContent } from '$lib/server/cms';
import { collections, withTransaction } from '$lib/server/database';
import { refreshAvailableStockInDb } from '$lib/server/product.js';
import { runtimeConfig } from '$lib/server/runtime-config.js';
import { userIdentifier, userQuery } from '$lib/server/user.js';
import { CUSTOMER_ROLE_ID } from '$lib/types/User';
import { error, redirect } from '@sveltejs/kit';

export async function load({ parent, locals }) {
	if (
		runtimeConfig.hideCartInToolbar &&
		(locals.user?.roleId === undefined || locals.user.roleId === CUSTOMER_ROLE_ID)
	) {
		throw error(403, 'This page is not accessible ');
	}

	const parentData = await parent();

	if (parentData.cart) {
		try {
			await checkCartItems(parentData.cart.items, { user: userIdentifier(locals) });
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
	return {
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
