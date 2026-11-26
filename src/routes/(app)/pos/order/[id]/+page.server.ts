import { error, type RequestEvent } from '@sveltejs/kit';
import { actions as adminOrderActions } from '../../../admin[[hash=admin_hash]]/order/[id]/+page.server';
import { collections } from '$lib/server/database';
import { isAllowedOnPage } from '$lib/types/Role';
import { adminPrefix } from '$lib/server/admin';

async function throwIfPosAccountCannotManageOrder(event: RequestEvent<{ id: string }>) {
	const { id } = event.params;
	const order = await collections.orders.findOne({ _id: id });

	if (order?.user.userId?.equals(event.locals.user?._id ?? '')) {
		return;
	}
	// A role the account points at but that no longer exists grants nothing, not everything.
	const role = event.locals.user?.role;
	if (!role || !isAllowedOnPage(role, `${adminPrefix()}/order/${id}`, 'write')) {
		throw error(403, 'Order does not belong to this POS account.');
	}
}

export const actions = {
	addPayment: async function (event) {
		await throwIfPosAccountCannotManageOrder(event);

		const addPayment = adminOrderActions.addPayment;

		// @ts-expect-error different route but compatible
		return addPayment(event);
	},
	saveNote: async function (event) {
		await throwIfPosAccountCannotManageOrder(event);

		const saveNote = adminOrderActions.saveNote;

		// @ts-expect-error different route but compatible
		return saveNote(event);
	},
	cancel: async function (event) {
		await throwIfPosAccountCannotManageOrder(event);

		const cancel = adminOrderActions.cancel;

		// @ts-expect-error different route but compatible
		return cancel(event);
	},
	forwardReceipt: async function (event) {
		await throwIfPosAccountCannotManageOrder(event);

		const forwardReceipt = adminOrderActions.forwardReceipt;

		// @ts-expect-error different route but compatible
		return forwardReceipt(event);
	}
};
