import { ItemForPriceInfo, ProductForPriceInfo } from '$lib/cart';
import { collections } from '$lib/server/database';
import { ObjectId } from 'mongodb';
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
import { CURRENCY_UNIT } from '$lib/types/Currency';
import { runtimeConfig } from '$lib/server/runtime-config';
import { paymentMethods, type PaymentMethod } from '$lib/server/payment-methods';
import { resolvePoolLabel } from '$lib/types/PosTabGroup';

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

async function getHydratedOrderTab(locale: Locale, tab: OrderTab) {
	return {
		slug: tab.slug,
		items: await hydratedOrderItems(locale, tab.items),
		discount: tab.discount
	};
}

export const load = async ({ depends, locals, params }) => {
	const tabSlug = params.orderTabSlug;
	const tab = await getOrCreateOrderTab({ slug: tabSlug });

	const [orderTab, allPoolOrders, posSubtypes] = await Promise.all([
		getHydratedOrderTab(locals.language, tab),
		collections.orders
			.find({
				orderTabId: tab._id,
				status: { $in: ['pending', 'paid'] }
			})
			.toArray(),
		collections.posPaymentSubtypes
			.find({ disabled: { $ne: true } })
			.sort({ sortOrder: 1 })
			.toArray(),
		clearAbandonedCartsAndOrdersFromTab(tab)
	]);

	const poolLabel = resolvePoolLabel(runtimeConfig.posTabGroups, tabSlug);

	const sellerIdentity = runtimeConfig.sellerIdentity;

	depends(UrlDependency.orderTab(tabSlug));

	const sharesOrder = allPoolOrders.find((o) => o.splitMode === 'shares');

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
			method: payment.method,
			orderId: order._id
		}))
	);

	let sharesOrderData = null;

	if (allPayments.length > 0) {
		// Use sharesOrder for remaining calculation if exists, otherwise use first order's currency
		const referenceOrder = sharesOrder ?? allPoolOrders[0];
		const currency = referenceOrder.currencySnapshot.main.totalPrice.currency;
		const remainingToPay = sharesOrder ? orderRemainingToPay(sharesOrder) : null;

		const totalAlreadyPaid = allPayments
			.filter((p) => p.isPaid)
			.reduce((sum, p) => sum + p.amount, 0);

		sharesOrderData = {
			_id: sharesOrder?._id ?? null,
			currency,
			totalPrice: sharesOrder?.currencySnapshot.main.totalPrice.amount ?? null,
			totalAlreadyPaid,
			remainingToPay,
			isFullyPaid: sharesOrder
				? remainingToPay === 0 ||
				  (remainingToPay !== null && remainingToPay < CURRENCY_UNIT[currency])
				: false,
			payments: allPayments
		};
	}

	orderTab.items satisfies ItemForPriceInfo[];

	const methods = paymentMethods({ hasPosOptions: true, includePOS: true });

	const companyLogoId = runtimeConfig.ticketLogoId || runtimeConfig.logo?.pictureId;
	const companyLogoUrl = companyLogoId ? `/picture/raw/${companyLogoId}/format/128` : undefined;

	const showBebopLogo = !runtimeConfig.removeBebopLogoPOS;

	return {
		orderTab,
		tabSlug,
		poolLabel,
		posMobileBreakpoint: runtimeConfig.posMobileBreakpoint ?? 1024,
		sharesOrder: sharesOrderData,
		availablePaymentMethods: methods,
		paymentSubtypes: posSubtypes.map((s) => ({
			slug: s.slug,
			name: s.name,
			parentMethod: 'point-of-sale' as PaymentMethod
		})),
		companyInfo: {
			businessName: sellerIdentity?.businessName,
			address: sellerIdentity?.address,
			vatNumber: sellerIdentity?.vatNumber,
			phone: sellerIdentity?.contact?.phone
		},
		companyLogoUrl,
		showBebopLogo
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
		customAmount: z.coerce.number().nonnegative()
	})
]);

export const actions = {
	checkoutTabPartial: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const user = userIdentifier(locals);

		let itemQuantities: Map<string, number> | null = null;
		if (formData.has('itemQuantities')) {
			try {
				itemQuantities = new Map(
					itemQuantitiesSchema.parse(JSON.parse(formData.get('itemQuantities') as string))
				);
				if (!itemQuantities.size) {
					return fail(400, { error: 'No items selected' });
				}
			} catch (err) {
				return fail(400, { error: err instanceof Error ? err.message : 'Invalid item data' });
			}
		}

		const paymentParams = sharePaymentSchema.safeParse(Object.fromEntries(formData));

		if (itemQuantities || paymentParams.success) {
			const splitMode: 'items' | 'shares' = itemQuantities ? 'items' : 'shares';

			const selectedMethod = (formData.get('paymentMethod') as PaymentMethod) || 'point-of-sale';
			const selectedSubtype = formData.get('subtype') as string | null;

			const orderTab = await getOrCreateOrderTab({ slug: params.orderTabSlug });

			let order =
				splitMode === 'shares'
					? await collections.orders.findOne({
							orderTabId: orderTab._id,
							splitMode: 'shares',
							status: { $in: ['pending', 'paid'] },
							'payments.0': { $exists: true }
					  })
					: null;

			if (!order) {
				await removeUserCarts(user);

				if (splitMode === 'items' && itemQuantities) {
					await checkoutOrderTab({
						slug: params.orderTabSlug,
						user,
						splitMode,
						itemQuantities
					});
				} else if (splitMode === 'shares') {
					await checkoutOrderTab({ slug: params.orderTabSlug, user, splitMode });
				}

				const cart = await collections.carts.findOne({
					orderTabSlug: params.orderTabSlug,
					orderTabId: orderTab._id,
					splitMode
				});
				if (!cart) {
					console.error('Cart creation failed for orderTab:', {
						orderTabSlug: params.orderTabSlug,
						orderTabId: orderTab._id
					});
					throw error(500, 'Failed to create cart for split payment');
				}

				const products = await collections.products
					.find({ _id: { $in: cart.items.map((i) => i.productId) } })
					.toArray();

				const productById = new Map(products.map((p) => [p._id.toString(), p]));
				const items = cart.items.map((cartItem) => {
					const product = productById.get(cartItem.productId.toString());
					if (!product) {
						throw new Error(`Product ${cartItem.productId} not found`);
					}

					return {
						_id: cartItem._id ? new ObjectId(cartItem._id) : undefined,
						quantity: cartItem.quantity,
						product,
						internalNote: cartItem.internalNote,
						chosenVariations: cartItem.chosenVariations,
						discountPercentage: cartItem.discountPercentage
					};
				});

				const orderId = await createOrder(items, null, {
					locale: locals.language,
					user,
					userVatCountry: runtimeConfig.vatCountry,
					shippingAddress: null,
					cart,
					peopleCountFromPosUi: orderTab.peopleCountFromPosUi
				});

				order = await collections.orders.findOne({ _id: orderId });
				if (!order) {
					throw new Error('Failed to create order');
				}
			}

			const remainingToPay = orderRemainingToPay(order);
			// Division may produce non-integer (e.g. 10/6 = 1.666...)
			// Rounded to currency precision in addOrderPayment() → toCurrency()
			const amountToPay =
				splitMode === 'items'
					? order.currencySnapshot.main.totalPrice.amount // full amount
					: paymentParams.success && paymentParams.data.mode === 'equal'
					? remainingToPay / paymentParams.data.shares
					: paymentParams.success && paymentParams.data.mode === 'custom-amount'
					? Math.min(paymentParams.data.customAmount, remainingToPay)
					: order.currencySnapshot.main.totalPrice.amount;

			await addOrderPayment(
				order,
				selectedMethod,
				{
					amount: amountToPay,
					currency: order.currencySnapshot.main.totalPrice.currency
				},
				{
					ignorePendingPayments: true,
					...(selectedSubtype && { posSubtype: selectedSubtype })
				}
			);

			const returnUrl = `/pos/touch/tab/${params.orderTabSlug}/split?mode=${splitMode}`;
			throw redirect(303, `/order/${order._id}?returnTo=${encodeURIComponent(returnUrl)}`);
		}

		// Invalid request - neither itemQuantities nor valid payment params
		return fail(400, { error: 'Invalid request: missing itemQuantities or payment params' });
	},

	closePool: async ({ params }) => {
		const { concludeOrderTab } = await import('$lib/server/orderTab');
		await concludeOrderTab({ slug: params.orderTabSlug });
		throw redirect(303, `/pos/touch/tab/${params.orderTabSlug}`);
	}
};
