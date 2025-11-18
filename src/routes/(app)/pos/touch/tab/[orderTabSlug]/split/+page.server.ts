import { ItemForPriceInfo, ProductForPriceInfo } from '$lib/cart';
import { collections } from '$lib/server/database';
import {
	clearAbandonedCartsAndOrdersFromTab,
	getOrCreateOrderTab,
	checkoutOrderTab
} from '$lib/server/orderTab';
import { OrderTab } from '$lib/types/OrderTab';
import { UrlDependency } from '$lib/types/UrlDependency';
import { removeUserCarts } from '$lib/server/cart';
import { userIdentifier } from '$lib/server/user';
import { fail, redirect, error } from '@sveltejs/kit';
import { z } from 'zod';
import { createOrder, addOrderPayment } from '$lib/server/orders';
import { orderRemainingToPay } from '$lib/types/Order';
import { CURRENCY_UNIT, type Currency } from '$lib/types/Currency';
import { runtimeConfig } from '$lib/server/runtime-config';

type Locale = App.Locals['language'];
type ProductProjection = ProductForPriceInfo & { name: string };

type HydratedTabItem = {
	internalNote?: {
		value: string;
		updatedAt: Date;
	};
	product: Omit<ProductProjection, 'vatProfileId'> & { vatProfileId?: string };
	quantity: number;
	originalQuantity?: number;
	tabItemId: string;
	orderId?: string;
};

async function hydratedOrderItems(
	locale: Locale,
	tabItems: OrderTab['items']
): Promise<HydratedTabItem[]> {
	const products = await collections.products
		.find({
			_id: { $in: tabItems.map((it) => it.productId) }
		})
		.project<ProductProjection>({
			_id: 1,
			name: { $ifNull: [`$translations.${locale}.name`, '$name'] },
			price: 1,
			shortDescription: {
				$ifNull: [`$translations.${locale}.shortDescription`, '$shortDescription']
			},
			vatProfileId: 1,
			variationLabels: {
				$ifNull: [`$translations.${locale}.variationLabels`, '$variationLabels']
			}
		})
		.toArray();
	const productById = new Map(products.map((p) => [p._id, p]));
	return tabItems
		.map((item) => {
			const product = productById.get(item.productId);
			if (product) {
				return {
					internalNote: item.internalNote && {
						value: item.internalNote.value,
						updatedAt: item.internalNote.updatedAt
					},
					product: { ...product, vatProfileId: product.vatProfileId?.toString() },
					quantity: item.quantity,
					originalQuantity: item.originalQuantity,
					tabItemId: item._id.toString(),
					orderId: item.orderId
				};
			}
		})
		.filter((item): item is NonNullable<typeof item> => item !== undefined);
}

async function getHydratedOrderTab(locale: Locale, tabSlug: string) {
	const tab = await getOrCreateOrderTab({ slug: tabSlug });
	return { slug: tab.slug, items: await hydratedOrderItems(locale, tab.items) };
}

export const load = async ({ depends, locals, params }) => {
	const tabSlug = params.orderTabSlug;
	await clearAbandonedCartsAndOrdersFromTab(tabSlug);

	const tab = await getOrCreateOrderTab({ slug: tabSlug });

	const orderTab = await getHydratedOrderTab(locals.language, tabSlug);
	depends(UrlDependency.orderTab(tabSlug));

	const allPoolOrders = await collections.orders
		.find({
			orderTabId: tab._id,
			status: { $in: ['pending', 'paid'] }
		})
		.toArray();

	const sharesOrder = allPoolOrders.find((o) => o.splitMode === 'shares');

	let sharesOrderData = null;

	if (sharesOrder) {
		let paymentCounter = 1;
		const allPayments = allPoolOrders.flatMap((order) =>
			order.payments.map((payment) => ({
				splitMode: order.splitMode as 'items' | 'shares',
				number: paymentCounter++,
				amount: payment.currencySnapshot.main.price.amount,
				currency: payment.currencySnapshot.main.price.currency,
				status: payment.status,
				isPaid: payment.status === 'paid',
				createdAt: payment.createdAt || new Date(),
				paidAt: payment.paidAt,
				method: payment.method
			}))
		);

		const totalAlreadyPaid = allPayments
			.filter((p) => p.isPaid)
			.reduce((sum, p) => sum + p.amount, 0);

		const remainingToPay = orderRemainingToPay(sharesOrder);
		const currency = sharesOrder.currencySnapshot.main.totalPrice.currency;

		sharesOrderData = {
			_id: sharesOrder._id,
			currency,
			totalPrice: sharesOrder.currencySnapshot.main.totalPrice.amount,
			totalAlreadyPaid,
			remainingToPay,
			isFullyPaid: remainingToPay === 0 || remainingToPay < CURRENCY_UNIT[currency],
			payments: allPayments
		};
	}

	orderTab.items satisfies ItemForPriceInfo[];
	return {
		orderTab,
		tabSlug,
		sharesOrder: sharesOrderData
	};
};

const itemQuantitiesSchema = z.array(z.tuple([z.string(), z.number().positive()]));

const sharePaymentSchema = z.discriminatedUnion('mode', [
	z.object({
		mode: z.literal('equal'),
		shares: z.coerce.number().int().min(2)
	}),
	z.object({
		mode: z.literal('custom-amount'),
		customAmount: z.coerce.number().positive()
	})
]);

export const actions = {
	checkoutTabPartial: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const user = userIdentifier(locals);

		if (formData.has('itemQuantities')) {
			try {
				const itemQuantities = new Map(
					itemQuantitiesSchema.parse(JSON.parse(formData.get('itemQuantities') as string))
				);
				if (!itemQuantities.size) {
					return fail(400, { error: 'No items selected' });
				}

				await removeUserCarts(user);
				await checkoutOrderTab({ slug: params.orderTabSlug, user, itemQuantities });
			} catch (err) {
				return fail(400, { error: err instanceof Error ? err.message : 'Invalid item data' });
			}

			throw redirect(303, '/checkout');
		}

		const orderTab = await getOrCreateOrderTab({ slug: params.orderTabSlug });

		const paymentParams = sharePaymentSchema.safeParse(Object.fromEntries(formData));

		if (paymentParams.success) {
			let order = await collections.orders.findOne({
				orderTabId: orderTab._id,
				splitMode: 'shares',
				status: { $in: ['pending', 'paid'] }
			});

			if (!order) {
				await checkoutOrderTab({ slug: params.orderTabSlug, user, splitMode: 'shares' });

				const cart = await collections.carts.findOne({
					orderTabSlug: params.orderTabSlug,
					orderTabId: orderTab._id,
					splitMode: 'shares'
				});
				if (!cart) {
				console.error('Cart creation failed for orderTab:', {
					orderTabSlug: params.orderTabSlug,
					orderTabId: orderTab._id
				});
				throw error(500, 'Failed to create cart for split payment');
			}

				const products = await collections.products
					.find({ _id: { $in: orderTab.items.map((i) => i.productId) } })
					.toArray();

				const productById = new Map(products.map((p) => [p._id.toString(), p]));
				const items = orderTab.items.map((item) => {
					const product = productById.get(item.productId.toString());
					if (!product) throw new Error(`Product ${item.productId} not found`);
					return {
						_id: item._id,
						quantity: item.quantity,
						product,
						internalNote: item.internalNote,
						chosenVariations: item.chosenVariations
					};
				});

				const orderId = await createOrder(items, null, {
					locale: locals.language,
					user,
					userVatCountry: runtimeConfig.vatCountry,
					shippingAddress: null,
					cart
				});

				order = await collections.orders.findOne({ _id: orderId });
				if (!order) throw new Error('Failed to create order');
			}

			const remainingToPay = orderRemainingToPay(order);
			const amountToPay =
				paymentParams.data.mode === 'equal'
					? remainingToPay / paymentParams.data.shares
					: Math.min(paymentParams.data.customAmount, remainingToPay);

			await addOrderPayment(order, 'point-of-sale', {
				amount: amountToPay,
				currency: order.currencySnapshot.main.totalPrice.currency
			});

			const returnUrl = `/pos/touch/tab/${params.orderTabSlug}/split?mode=shares`;
			throw redirect(303, `/order/${order._id}?returnTo=${encodeURIComponent(returnUrl)}`);
		}

		await removeUserCarts(user);

		try {
			await checkoutOrderTab({
				slug: params.orderTabSlug,
				user,
				splitMode: 'shares'
			});
		} catch (error) {
			return fail(400, { error: error instanceof Error ? error.message : 'Unknown error' });
		}

		throw redirect(303, '/checkout');
	},

	closePool: async ({ params }) => {
		const { concludeOrderTab } = await import('$lib/server/orderTab');
		await concludeOrderTab({ slug: params.orderTabSlug });
		throw redirect(303, `/pos/touch/tab/${params.orderTabSlug}`);
	}
};
