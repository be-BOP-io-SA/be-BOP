import { collections } from '$lib/server/database';
import type { Order } from '$lib/types/Order';

/**
 * Split the labels a payload asked for into the ones the shop actually has and the rest.
 *
 * The rest is not a reason to refuse the order: the sale happened, and a label the shop never
 * created is a mistake in the caller's configuration, not in the sale. It is reported as a warning
 * and the order is written without it.
 */
export async function resolveOrderLabels(
	labelIds: string[] | undefined
): Promise<{ found: string[]; missing: string[] }> {
	const wanted = [...new Set(labelIds ?? [])];
	if (!wanted.length) {
		return { found: [], missing: [] };
	}
	const existing = await collections.labels
		.find({ _id: { $in: wanted } })
		.project<{ _id: string }>({ _id: 1 })
		.toArray();
	const known = new Set(existing.map((label) => label._id));
	return {
		found: wanted.filter((id) => known.has(id)),
		missing: wanted.filter((id) => !known.has(id))
	};
}

export type AddLabelResult =
	| { ok: true; orderId: string; labels: Array<{ id: string; name: string }> }
	| { ok: false; reason: 'ORDER_NOT_FOUND' | 'LABEL_NOT_FOUND' };

/**
 * Add an order label to an order that already exists.
 *
 * `$addToSet` rather than `$push`: a till that retries a request must not end up with the same
 * label twice on the order, and a retry that changes nothing is the point of an idempotent write.
 *
 * The label must exist. An unknown id would be stored happily by Mongo and would then show up
 * nowhere — not in the admin listing, whose filter only offers labels it knows, and not in the
 * order read, whose names come from the same collection.
 */
export async function addOrderLabel(params: {
	orderId: string;
	labelId: string;
}): Promise<AddLabelResult> {
	const label = await collections.labels.findOne(
		{ _id: params.labelId },
		{ projection: { _id: 1, name: 1 } }
	);
	if (!label) {
		return { ok: false, reason: 'LABEL_NOT_FOUND' };
	}

	const updated = await collections.orders.findOneAndUpdate(
		{ _id: params.orderId },
		{ $addToSet: { orderLabelIds: params.labelId }, $set: { updatedAt: new Date() } },
		{ returnDocument: 'after', projection: { orderLabelIds: 1 } }
	);
	const order = (updated.value ?? null) as Pick<Order, 'orderLabelIds'> | null;
	if (!order) {
		return { ok: false, reason: 'ORDER_NOT_FOUND' };
	}

	const ids = order.orderLabelIds ?? [];
	const names = await collections.labels
		.find({ _id: { $in: ids } })
		.project<{ _id: string; name: string }>({ _id: 1, name: 1 })
		.toArray();
	const byId = new Map(names.map((row) => [row._id, row.name]));

	return {
		ok: true,
		orderId: params.orderId,
		labels: ids.map((id) => ({ id, name: byId.get(id) ?? id }))
	};
}
