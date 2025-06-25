import { collections } from '$lib/server/database';
import { UrlDependency } from '$lib/types/UrlDependency';
import { redirect } from '@sveltejs/kit';
import { fetchOrderForUser } from './fetchOrderForUser.js';
import { getPublicS3DownloadLink } from '$lib/server/s3.js';
import { uniqBy } from '$lib/utils/uniqBy.js';
import { cmsFromContent } from '$lib/server/cms.js';
import { conflictingTapToPayOrder } from '$lib/server/orders.js';
import { CUSTOMER_ROLE_ID } from '$lib/types/User.js';
import { runtimeConfig } from '$lib/server/runtime-config.js';
import { paymentMethods } from '$lib/server/payment-methods.js';
import type { OrderLabel } from '$lib/types/OrderLabel.js';

export async function load({ params, depends, locals }) {
	depends(UrlDependency.Order);

	const order = await fetchOrderForUser(params.id, { userRoleId: locals.user?.roleId });

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
				_id: 'order-bottom'
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
	let methods = paymentMethods({ hasPosOptions: locals.user?.hasPosOptions }).filter(
		(method) => method !== 'free'
	);

	for (const item of order.items) {
		if (item.product.paymentMethods) {
			methods = methods.filter((method) => item.product.paymentMethods?.includes(method));
		}
	}
	let labels: OrderLabel[] = [];
	if (locals.user?.roleId && locals.user.roleId !== CUSTOMER_ROLE_ID) {
		labels = await collections.labels.find({}).toArray();
	}
	const forceContentVersion =
		locals.user?.roleId !== undefined && locals.user?.roleId !== CUSTOMER_ROLE_ID
			? 'employee'
			: undefined;
	const tapToPay = {
		configured: !!runtimeConfig.posTapToPay.processor,
		inUseByOtherOrder: !!(await conflictingTapToPayOrder(order._id)),
		onActivationUrl: runtimeConfig.posTapToPay.onActivationUrl
	};
	return {
		order,
		paymentMethods: methods,
		tapToPay,
		digitalFiles: Promise.all(
			digitalFiles.map(async (file) => ({
				name: file.name,
				size: file.storage.size,
				link: order.status === 'paid' ? await getPublicS3DownloadLink(file.storage.key) : undefined
			}))
		),
		...(cmsOrderTop && {
			cmsOrderTop,
			cmsOrderTopData: cmsFromContent(
				{
					desktopContent: cmsOrderTop.content,
					employeeContent:
						(cmsOrderTop.hasEmployeeContent && cmsOrderTop.employeeContent) || undefined,
					forceContentVersion
				},
				locals
			)
		}),
		...(cmsOrderBottom && {
			cmsOrderBottom,
			cmsOrderBottomData: cmsFromContent(
				{
					desktopContent: cmsOrderBottom.content,
					employeeContent:
						(cmsOrderBottom.hasEmployeeContent && cmsOrderBottom.employeeContent) || undefined,
					forceContentVersion
				},
				locals
			)
		}),
		overwriteCreditCardSvgColor: runtimeConfig.overwriteCreditCardSvgColor,
		hideCreditCardQrCode: runtimeConfig.hideCreditCardQrCode,
		labels
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
	}
};
