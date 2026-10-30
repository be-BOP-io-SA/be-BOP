import { collections } from '$lib/server/database';
import { isUniqueConstraintError } from '$lib/server/utils/isUniqueConstraintError';
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
	| {
			ok: true;
			orderId: string;
			labels: Array<{ id: string; name: string }>;
			/** True when this call is what brought the label into the shop. */
			labelCreated: boolean;
	  }
	| { ok: false; reason: 'ORDER_NOT_FOUND' | 'INVALID_LABEL_ID' };

/** What a label looks like when the caller says nothing about it. */
const DEFAULT_LABEL_COLOR = '#6b7280';
const DEFAULT_LABEL_ICON = '🏷️';

/**
 * Same shape the admin form enforces: the id ends up in a URL, so the characters that would break
 * one are refused. Checked only when a label is about to be created — an id that already exists is
 * looked up as it always was, whatever it is made of.
 */
const LABEL_ID_SHAPE = /^(?!admin$)(?!admin-)[^/\\?#]+$/;

/**
 * Create the label if the shop does not have it yet, and return whether it was created.
 *
 * An existing label is never touched: two tills configured differently would otherwise repaint
 * each other's label on every order, and the shop would watch its own listing change colour.
 */
async function ensureOrderLabel(
	labelId: string,
	presentation?: { name?: string; color?: string; icon?: string }
): Promise<{ created: boolean } | { invalidId: true }> {
	const existing = await collections.labels.findOne({ _id: labelId }, { projection: { _id: 1 } });
	if (existing) {
		return { created: false };
	}

	if (!LABEL_ID_SHAPE.test(labelId)) {
		return { invalidId: true };
	}

	const now = new Date();
	try {
		await collections.labels.insertOne({
			_id: labelId,
			name: presentation?.name ?? labelId,
			color: presentation?.color ?? DEFAULT_LABEL_COLOR,
			icon: presentation?.icon ?? DEFAULT_LABEL_ICON,
			createdAt: now,
			updatedAt: now
		});
		return { created: true };
	} catch (err) {
		// Two tills asking at the same instant: whoever lost the race still gets the label.
		if (!isUniqueConstraintError(err)) {
			throw err;
		}
		return { created: false };
	}
}

/**
 * Add an order label to an order that already exists.
 *
 * `$addToSet` rather than `$push`: a till that retries a request must not end up with the same
 * label twice on the order, and a retry that changes nothing is the point of an idempotent write.
 *
 * A label the shop does not have yet is created rather than refused, so an integration can label
 * its orders without someone opening the admin first. The caller may say how it should look; left
 * unsaid, it carries its own id as a name and a neutral colour, and the shop can dress it later.
 */
export async function addOrderLabel(params: {
	orderId: string;
	labelId: string;
	/** How the label should look if the shop does not have it yet. Ignored when it already does. */
	label?: { name?: string; color?: string; icon?: string };
}): Promise<AddLabelResult> {
	const order = await collections.orders.findOne(
		{ _id: params.orderId },
		{ projection: { _id: 1 } }
	);
	if (!order) {
		return { ok: false, reason: 'ORDER_NOT_FOUND' };
	}

	const ensured = await ensureOrderLabel(params.labelId, params.label);
	if ('invalidId' in ensured) {
		return { ok: false, reason: 'INVALID_LABEL_ID' };
	}

	const updated = await collections.orders.findOneAndUpdate(
		{ _id: params.orderId },
		{ $addToSet: { orderLabelIds: params.labelId }, $set: { updatedAt: new Date() } },
		{ returnDocument: 'after', projection: { orderLabelIds: 1 } }
	);
	// The order was there a moment ago; it can still have been deleted between the two calls.
	const labelled = (updated.value ?? null) as Pick<Order, 'orderLabelIds'> | null;
	if (!labelled) {
		return { ok: false, reason: 'ORDER_NOT_FOUND' };
	}

	const ids = labelled.orderLabelIds ?? [];
	const names = await collections.labels
		.find({ _id: { $in: ids } })
		.project<{ _id: string; name: string }>({ _id: 1, name: 1 })
		.toArray();
	const byId = new Map(names.map((row) => [row._id, row.name]));

	return {
		ok: true,
		orderId: params.orderId,
		labels: ids.map((id) => ({ id, name: byId.get(id) ?? id })),
		labelCreated: ensured.created
	};
}
