import { error } from '@sveltejs/kit';
import { actions as adminOrderActions } from '../../../admin[[hash=admin_hash]]/order/[id]/+page.server';
import { collections } from '$lib/server/database';
import { isAllowedOnPage } from '$lib/types/Role';
import { adminPrefix } from '$lib/server/admin';

export const actions = {
	addPayment: async function (event) {
		const { id } = event.params;
		const order = await collections.orders.findOne({ _id: id });

		if (!order?.user.userId?.equals(event.locals.user?._id ?? '')) {
			if (
				event.locals.user?.role &&
				!isAllowedOnPage(event.locals.user.role, `${adminPrefix()}/order/${id}`, 'write')
			) {
				throw error(403, 'Order does not belong to this POS account.');
			}
		}

		const addPayment = adminOrderActions.addPayment;

		// @ts-expect-error different route but compatible
		return addPayment(event);
	},
	saveNote: async function (event) {
		const { id } = event.params;

		const order = await collections.orders.findOne({ _id: id });

		if (!order?.user.userId?.equals(event.locals.user?._id ?? '')) {
			if (
				event.locals.user?.role &&
				!isAllowedOnPage(event.locals.user.role, `${adminPrefix()}/order/${id}`, 'write')
			) {
				throw error(403, 'Order does not belong to this POS account.');
			}
		}

		const saveNote = adminOrderActions.saveNote;

		// @ts-expect-error different route but compatible
		return saveNote(event);
	},
	cancel: async function (event) {
		const { id } = event.params;

		const order = await collections.orders.findOne({ _id: id });

		if (!order?.user.userId?.equals(event.locals.user?._id ?? '')) {
			if (
				event.locals.user?.role &&
				!isAllowedOnPage(event.locals.user.role, `${adminPrefix()}/order/${id}`, 'write')
			) {
				throw error(403, 'Order does not belong to this POS account.');
			}
		}

		const cancel = adminOrderActions.cancel;

		// @ts-expect-error different route but compatible
		return cancel(event);
	}
};
