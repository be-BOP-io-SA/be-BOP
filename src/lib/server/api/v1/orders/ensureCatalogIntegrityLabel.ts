import { collections } from '$lib/server/database';
import { isUniqueConstraintError } from '$lib/server/utils/isUniqueConstraintError';

export const CATALOG_INTEGRITY_WARNING_LABEL_ID = 'catalog-integrity-warning';

/**
 * Ensure the catalog-integrity-warning label exists (create-if-missing).
 * Returns the label _id to attach on orders that include missing products.
 */
export async function ensureCatalogIntegrityLabel(): Promise<string> {
	const existing = await collections.labels.findOne({ _id: CATALOG_INTEGRITY_WARNING_LABEL_ID });
	if (existing) {
		return existing._id;
	}

	const now = new Date();
	try {
		await collections.labels.insertOne({
			_id: CATALOG_INTEGRITY_WARNING_LABEL_ID,
			name: 'Catalog integrity warning',
			color: '#f59e0b',
			icon: 'warning',
			createdAt: now,
			updatedAt: now
		});
	} catch (err) {
		if (!isUniqueConstraintError(err)) {
			throw err;
		}
	}
	return CATALOG_INTEGRITY_WARNING_LABEL_ID;
}
