import { collections } from '$lib/server/database';
import { UrlDependency } from '$lib/types/UrlDependency';
import { error, redirect } from '@sveltejs/kit';
import { fetchOrderForUser } from './fetchOrderForUser.js';
import { getPublicS3DownloadLink } from '$lib/server/s3.js';
import { uniqBy } from '$lib/utils/uniqBy.js';
import { cmsFromContent } from '$lib/server/cms.js';
import { runtimeConfig } from '$lib/server/runtime-config.js';
import { addOrderPayment } from '$lib/server/orders';
import { paymentMethods, type PaymentMethod } from '$lib/server/payment-methods.js';
import { parsePriceAmount } from '$lib/types/Currency.js';
import { orderAmountWithNoPaymentsCreated as orderAmountWithNoPayments } from '$lib/types/Order.js';
import { z } from 'zod';

export async function load({ params, depends, locals }) {
	depends(UrlDependency.Order);

	const order = await fetchOrderForUser(params.id);

	const digitalFiles = uniqBy(
		order.items.flatMap((item) => item.digitalFiles),
		(file) => file._id
	);
	const [cmsOrderTop, cmsOrderBottom] = await Promise.all([
		collections.cmsPages.findOne(
			{
				_id: 'order-top'
			},
			{
				projection: {
					content: { $ifNull: [`$translations.${locals.language}.content`, '$content'] },
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
				_id: 'order-bottom'
			},
			{
				projection: {
					content: { $ifNull: [`$translations.${locals.language}.content`, '$content'] },
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
	let methods = paymentMethods({ role: locals.user?.roleId });

	for (const item of order.items) {
		if (item.product.paymentMethods) {
			methods = methods.filter((method) => item.product.paymentMethods?.includes(method));
		}
	}

	return {
		order,
		paymentMethods: methods,
		digitalFiles: Promise.all(
			digitalFiles.map(async (file) => ({
				name: file.name,
				size: file.storage.size,
				link: order.status === 'paid' ? await getPublicS3DownloadLink(file.storage.key) : undefined
			}))
		),
		...(cmsOrderTop && {
			cmsOrderTop,
			cmsOrderTopData: cmsFromContent({ content: cmsOrderTop.content }, locals)
		}),
		...(cmsOrderBottom && {
			cmsOrderBottom,
			cmsOrderBottomData: cmsFromContent({ content: cmsOrderBottom.content }, locals)
		}),
		overwriteCreditCardSvgColor: runtimeConfig.overwriteCreditCardSvgColor,
		hideCreditCardQrCode: runtimeConfig.hideCreditCardQrCode
	};
}

export const actions = {
	cancel: async function ({ params, request }) {
		await collections.orders.updateOne(
			{
				_id: params.id,
				status: 'pending'
			},
			{
				$set: {
					status: 'canceled'
				}
			}
		);

		throw redirect(303, request.headers.get('referer') || '/');
	},
	addPayment: async ({ params, request, locals }) => {
		const order = await collections.orders.findOne({
			_id: params.id
		});

		if (!order) {
			throw error(404, 'Order not found');
		}

		if (order.status !== 'pending') {
			throw error(400, 'Order is not pending');
		}

		const remainingAmount = orderAmountWithNoPayments(order);

		if (remainingAmount <= 0) {
			throw error(400, 'Order has no remaining amount to pay');
		}

		let methods = paymentMethods({ role: locals.user?.roleId });

		for (const item of order.items) {
			if (item.product.paymentMethods) {
				methods = methods.filter((method) => item.product.paymentMethods?.includes(method));
			}
		}

		if (!methods.length) {
			throw error(400, 'No payment methods available');
		}

		const formData = await request.formData();
		const parsed = z
			.object({
				amount: z.string().regex(/^\d+(\.\d+)?$/),
				method: z.enum(methods as [PaymentMethod, ...PaymentMethod[]])
			})
			.parse({
				amount: formData.get('amount'),
				method: formData.get('method')
			});

		const amount = parsePriceAmount(parsed.amount, order.currencySnapshot.main.totalPrice.currency);
		if (amount <= 0) {
			throw error(400, 'Invalid amount');
		}
		if (amount > remainingAmount) {
			throw error(400, 'Amount is greater than the remaining amount to pay');
		}

		await addOrderPayment(
			order,
			parsed.method,
			{
				amount,
				currency: order.currencySnapshot.main.totalPrice.currency
			},
			{ expiresAt: null }
		);

		throw redirect(303, `/order/${order._id}`);
	}
};
