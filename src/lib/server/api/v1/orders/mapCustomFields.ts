import type { CollectedCheckoutField } from '$lib/types/Order';

/**
 * Map free-form API customFields to CollectedCheckoutField rows.
 * fieldId is namespaced as `api:{slug}` so they never collide with configured checkout fields.
 */
export function mapCustomFields(
	customFields?: Record<string, string | number | boolean>
): CollectedCheckoutField[] {
	if (!customFields) {
		return [];
	}
	return Object.entries(customFields).map(([slug, value]) => ({
		fieldId: `api:${slug}`,
		slug,
		name: slug,
		label: slug,
		type: 'free' as const,
		value: String(value)
	}));
}
