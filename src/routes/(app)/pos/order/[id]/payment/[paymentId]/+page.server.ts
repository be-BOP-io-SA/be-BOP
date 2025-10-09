import { collections } from '$lib/server/database';
import { error } from '@sveltejs/kit';
import { actions as adminOrderActions } from '../../../../../admin[[hash=admin_hash]]/order/[id]/payment/[paymentId]/+page.server';
import { adminPrefix } from '$lib/server/admin';
import { isAllowedOnPage } from '$lib/types/Role';
import type { Order } from '$lib/types/Order';

function throwIfPosAccountCannotManageOrder(
	order: Order | null,
	paymentId: string,
	user?: App.Locals['user']
) {
	if (!order) {
		return;
	}
	if (!order.user.userId?.equals(user?._id ?? '')) {
		if (
			user?.role &&
			!isAllowedOnPage(
				user.role,
				`${adminPrefix()}/order/${order._id}/payment/${paymentId}`,
				'write'
			)
		) {
			throw error(403, 'Order does not belong to this POS account.');
		}
	}
}

export const actions = {
	confirm: async (event) => {
		const { id, paymentId } = event.params;
		const order = await collections.orders.findOne({ _id: id });
		throwIfPosAccountCannotManageOrder(order, paymentId, event.locals.user);
		const confirm = adminOrderActions.confirm;
		// @ts-expect-error different route but compatible
		return confirm(event);
	},

	cancel: async (event) => {
		const { id, paymentId } = event.params;
		const order = await collections.orders.findOne({ _id: id });
		throwIfPosAccountCannotManageOrder(order, paymentId, event.locals.user);
		const cancel = adminOrderActions.cancel;
		// @ts-expect-error different route but compatible
		return cancel(event);
	},

	cancelTapToPay: async (event) => {
		const { id, paymentId } = event.params;
		const order = await collections.orders.findOne({ _id: id });
		throwIfPosAccountCannotManageOrder(order, paymentId, event.locals.user);
		const cancelTapToPay = adminOrderActions.cancelTapToPay;
		// @ts-expect-error different route but compatible
		return cancelTapToPay(event);
	},

	tapToPay: async (event) => {
		const { id, paymentId } = event.params;
		const order = await collections.orders.findOne({ _id: id });
		throwIfPosAccountCannotManageOrder(order, paymentId, event.locals.user);
		const tapToPay = adminOrderActions.tapToPay;
		// @ts-expect-error different route but compatible
		return tapToPay(event);
	},

	updatePaymentDetail: async (event) => {
		const { id, paymentId } = event.params;
		const order = await collections.orders.findOne({ _id: id });
		throwIfPosAccountCannotManageOrder(order, paymentId, event.locals.user);
		const updatePaymentDetail = adminOrderActions.updatePaymentDetail;
		// @ts-expect-error different route but compatible
		return updatePaymentDetail(event);
	}
};
