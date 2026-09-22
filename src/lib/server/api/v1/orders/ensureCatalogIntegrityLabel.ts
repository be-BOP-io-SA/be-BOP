import { collections } from '$lib/server/database';
import { isUniqueConstraintError } from '$lib/server/utils/isUniqueConstraintError';

export const CATALOG_INTEGRITY_WARNING_LABEL_ID = 'catalog-integrity-warning';
export const API_ORDER_LABEL_ID = 'endpoint';

/** Labels the API creates for itself, with what the shop sees in its order listing. */
const MANAGED_LABELS = {
	[CATALOG_INTEGRITY_WARNING_LABEL_ID]: {
		name: 'Catalog integrity warning',
		color: '#f59e0b',
		icon: '⚠️'
	},
	[API_ORDER_LABEL_ID]: { name: 'Endpoint', color: '#6366f1', icon: '🤖' }
} as const;

/**
 * The icon a label was created with before icons were emoji.
 *
 * The field is rendered as-is next to the label name, so this one showed up as the word "warning"
 * on every order that carried it. Shops that already have the row get the emoji on the next write
 * rather than being left with the wrong one for good.
 */
const LEGACY_ICONS: Record<string, string> = { [CATALOG_INTEGRITY_WARNING_LABEL_ID]: 'warning' };

async function ensureLabel(id: keyof typeof MANAGED_LABELS): Promise<string> {
	const spec = MANAGED_LABELS[id];
	const existing = await collections.labels.findOne({ _id: id });
	if (existing) {
		const legacyIcon = LEGACY_ICONS[id];
		if (legacyIcon && existing.icon === legacyIcon) {
			await collections.labels.updateOne(
				{ _id: id, icon: legacyIcon },
				{ $set: { icon: spec.icon, updatedAt: new Date() } }
			);
		}
		return existing._id;
	}

	const now = new Date();
	try {
		await collections.labels.insertOne({
			_id: id,
			name: spec.name,
			color: spec.color,
			icon: spec.icon,
			createdAt: now,
			updatedAt: now
		});
	} catch (err) {
		if (!isUniqueConstraintError(err)) {
			throw err;
		}
	}
	return id;
}

/**
 * Ensure the catalog-integrity-warning label exists (create-if-missing).
 * Returns the label _id to attach on orders that include missing products.
 */
export async function ensureCatalogIntegrityLabel(): Promise<string> {
	return ensureLabel(CATALOG_INTEGRITY_WARNING_LABEL_ID);
}

/**
 * Ensure the label that marks a sale as coming from an integration (create-if-missing).
 *
 * Every order written through `/api/v1/orders` carries it, so the shop can pull them out of its
 * listing in one filter — the seller alias says the same thing but the listing cannot filter on it.
 */
export async function ensureApiOrderLabel(): Promise<string> {
	return ensureLabel(API_ORDER_LABEL_ID);
}
