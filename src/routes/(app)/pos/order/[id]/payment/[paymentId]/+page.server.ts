import { collections } from '$lib/server/database';
import { error } from '@sveltejs/kit';
import { actions as adminOrderActions } from '../../../../../admin[[hash=admin_hash]]/order/[id]/payment/[paymentId]/+page.server';
import { adminPrefix } from '$lib/server/admin';
import { isAllowedOnPage } from '$lib/types/Role';

export const actions = {
	confirm: async (event) => {
		const { id, paymentId } = event.params;
		const order = await collections.orders.findOne({ _id: id });

		if (!order?.user.userId?.equals(event.locals.user?._id ?? '')) {
			if (
				event.locals.user?.role &&
				!isAllowedOnPage(
					event.locals.user.role,
					`${adminPrefix()}/order/${id}/payment/${paymentId}`,
					'write'
				)
			) {
				throw error(403, 'Order does not belong to this POS account.');
			}
		}

		const confirm = adminOrderActions.confirm;

		// @ts-expect-error different route but compatible
		return confirm(event);
	},

	cancel: async (event) => {
		const { id, paymentId } = event.params;
		const order = await collections.orders.findOne({ _id: id });

		if (!order?.user.userId?.equals(event.locals.user?._id ?? '')) {
			if (
				event.locals.user?.role &&
				!isAllowedOnPage(
					event.locals.user.role,
					`${adminPrefix()}/order/${id}/payment/${paymentId}`,
					'write'
				)
			) {
				throw error(403, 'Order does not belong to this POS account.');
			}
		}

		const cancel = adminOrderActions.cancel;

		// @ts-expect-error different route but compatible
		return cancel(event);
	},

	updatePaymentDetail: async (event) => {
		const { id, paymentId } = event.params;
		const order = await collections.orders.findOne({ _id: id });

		if (!order?.user.userId?.equals(event.locals.user?._id ?? '')) {
			if (
				event.locals.user?.role &&
				!isAllowedOnPage(
					event.locals.user.role,
					`${adminPrefix()}/order/${id}/payment/${paymentId}`,
					'write'
				)
			) {
				throw error(403, 'Order does not belong to this POS account.');
			}
		}

		const updatePaymentDetail = adminOrderActions.updatePaymentDetail;

		// @ts-expect-error different route but compatible
		return updatePaymentDetail(event);
	}
};
