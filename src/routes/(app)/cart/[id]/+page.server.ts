import { addToCartInDb, removeFromCartInDb } from '$lib/server/cart';
import { collections, withTransaction } from '$lib/server/database';
import { refreshAvailableStockInDb } from '$lib/server/product.js';
import { userIdentifier, userQuery } from '$lib/server/user.js';
import { DEFAULT_MAX_QUANTITY_PER_ORDER } from '$lib/types/Product.js';
import { error, redirect } from '@sveltejs/kit';
import { z } from 'zod';

export const actions = {
	remove: async ({ locals, params, request }) => {
		const cart = await collections.carts.findOne(userQuery(userIdentifier(locals)));

		if (!cart) {
			throw error(404, 'This product is not in the cart');
		}

		const { depositPercentage } = z
			.object({
				depositPercentage: z.number({ coerce: true }).optional()
			})
			.parse(Object.fromEntries(await request.formData()));

		let item = cart.items.find(
			(i) =>
				i.productId === params.id &&
				(i.depositPercentage ?? undefined) === (depositPercentage ?? undefined)
		);

		// Like when calling from nostr handle message, we don't know which deposit percentage was used
		if (!item) {
			item = cart.items.find((i) => i.productId === params.id);
		}

		if (!item) {
			throw error(404, 'This product is not in the cart');
		}

		cart.items = cart.items.filter((it) => it !== item);

		await withTransaction(async (session) => {
			await collections.carts.updateOne(
				{ _id: cart._id },
				{ $set: { items: cart.items, updatedAt: new Date() } },
				{ session }
			);

			await refreshAvailableStockInDb(params.id, session);
		});

		throw redirect(303, request.headers.get('referer') || '/cart');
	},
	increase: async ({ locals, params, request }) => {
		const product = await collections.products.findOne({ _id: params.id });

		if (!product) {
			await collections.carts.updateOne(userQuery(userIdentifier(locals)), {
				$pull: { items: { productId: params.id } },
				$set: { updatedAt: new Date() }
			});
			throw error(404, 'This product does not exist');
		}

		const formData = await request.formData();

		const max = product.maxQuantityPerOrder || DEFAULT_MAX_QUANTITY_PER_ORDER;

		const { quantity, deposit } = z
			.object({
				quantity: z
					.number({ coerce: true })
					.int()
					.min(1)
					.max(max - 1),
				deposit: z.boolean({ coerce: true }).optional()
			})
			.parse({
				quantity: formData.get('quantity'),
				deposit: formData.get('deposit')
			});

		await addToCartInDb(product, quantity + 1, {
			user: userIdentifier(locals),
			mode: 'eshop',
			totalQuantity: true,
			deposit
		});

		throw redirect(303, request.headers.get('referer') || '/cart');
	},
	decrease: async ({ request, locals, params }) => {
		const product = await collections.products.findOne({ _id: params.id });

		if (!product) {
			await collections.carts.updateMany(
				{ productId: params.id },
				{ $pull: { items: { productId: params.id } }, $set: { updatedAt: new Date() } }
			);
			throw error(404, 'This product does not exist');
		}
		const formData = await request.formData();

		const max = product.maxQuantityPerOrder || DEFAULT_MAX_QUANTITY_PER_ORDER;
		const { quantity, depositPercentage } = z
			.object({
				quantity: z.number({ coerce: true }).int().min(1).max(max),
				depositPercentage: z.number({ coerce: true }).optional()
			})
			.parse(Object.fromEntries(formData));

		await removeFromCartInDb(product, quantity - 1, {
			user: userIdentifier(locals),
			totalQuantity: true,
			depositPercentage
		});

		throw redirect(303, request.headers.get('referer') || '/cart');
	},
	addNote: async ({ locals, params, request }) => {
		const cart = await collections.carts.findOne(userQuery(userIdentifier(locals)));

		if (!cart) {
			throw error(404, 'No cart found for user');
		}
		const formData = await request.formData();
		const { note } = z
			.object({
				note: z.string().trim().min(1)
			})
			.parse({
				note: formData.get('note')
			});

		const res = await collections.carts.updateOne(
			{ _id: cart._id, 'items.productId': params.id },
			{
				$set: {
					'items.$.internalNote': {
						value: note,
						updatedAt: new Date(),
						updatedById: locals.user?._id
					}
				}
			}
		);

		if (!res.matchedCount) {
			throw error(404, 'This product is not in the cart');
		}
	}
};
