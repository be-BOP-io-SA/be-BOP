import { collections } from '$lib/server/database';
import { CUSTOMER_ROLE_ID, SUPER_ADMIN_ROLE_ID } from '$lib/types/User';
import { API_ORDER_SELLER_ALIAS } from './seller';

export type AddNoteResult =
	| { ok: true; orderId: string; notes: OrderNoteDto[] }
	| { ok: false; reason: 'ORDER_NOT_FOUND' };

export type OrderNoteDto = {
	content: string;
	createdAt: string;
	/** `system` is be-BOP writing on its own behalf; `customer` is the buyer, the rest is staff. */
	author: 'employee' | 'customer' | 'system';
	/** Who wrote it, when the note carries an alias. API notes carry the integration's own. */
	alias?: string;
};

export function toOrderNoteDto(note: {
	content: string;
	createdAt: Date;
	role: string | null;
	userAlias?: string;
}): OrderNoteDto {
	return {
		content: note.content,
		createdAt: note.createdAt.toISOString(),
		author:
			note.role === null ? 'system' : note.role === CUSTOMER_ROLE_ID ? 'customer' : 'employee',
		...(note.userAlias && { alias: note.userAlias })
	};
}

/**
 * Append an employee note to an existing order.
 *
 * Written with the staff role and the integration's alias, so the note reads as coming from the
 * till rather than from nobody. It lands in the same list the admin and the customer already see —
 * be-BOP shows order notes to the buyer, flagged as staff or system, and this one is no exception.
 */
export async function addOrderNote(params: {
	orderId: string;
	content: string;
}): Promise<AddNoteResult> {
	const updated = await collections.orders.findOneAndUpdate(
		{ _id: params.orderId },
		{
			$push: {
				notes: {
					content: params.content,
					createdAt: new Date(),
					role: SUPER_ADMIN_ROLE_ID,
					userAlias: API_ORDER_SELLER_ALIAS
				}
			},
			$set: { updatedAt: new Date() }
		},
		{ returnDocument: 'after', projection: { notes: 1 } }
	);
	const order = updated.value;
	if (!order) {
		return { ok: false, reason: 'ORDER_NOT_FOUND' };
	}
	return {
		ok: true,
		orderId: params.orderId,
		notes: (order.notes ?? []).map(toOrderNoteDto)
	};
}
