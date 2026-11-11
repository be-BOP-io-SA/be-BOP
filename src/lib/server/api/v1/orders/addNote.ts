import { collections } from '$lib/server/database';
import type { ObjectId } from 'mongodb';
import { CUSTOMER_ROLE_ID } from '$lib/types/User';
import { API_NOTE_ROLE, apiNoteAlias } from './seller';

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
 * The note joins the staff notes of the order, signed "API - " and the name of the key that wrote
 * it, so the shop can tell which integration said what. It never carries an admin role. Staff notes
 * are shown to employees only: the buyer does not see them.
 */
export async function addOrderNote(params: {
	orderId: string;
	content: string;
	/** Name of the API key writing the note, shown as its author. */
	keyName: string;
	/** Set to an API key id, only an order written with that key is annotated; any other is not found. */
	ownedBy?: ObjectId;
}): Promise<AddNoteResult> {
	const updated = await collections.orders.findOneAndUpdate(
		{ _id: params.orderId, ...(params.ownedBy && { externalSourceApiKeyId: params.ownedBy }) },
		{
			$push: {
				notes: {
					content: params.content,
					createdAt: new Date(),
					role: API_NOTE_ROLE,
					userAlias: apiNoteAlias(params.keyName)
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
