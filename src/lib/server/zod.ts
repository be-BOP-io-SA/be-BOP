import { MAX_NAME_LIMIT } from '$lib/types/Product';
import { z } from 'zod';
import { isLabelColor } from '$lib/utils/labelColor';

export function zodObjectId() {
	return z.string().regex(/^[a-f0-9]{24}$/i);
}

/** A label color: hexadecimal or a named CSS color, nothing that could carry styles of its own. */
export function zodLabelColor() {
	return z
		.string()
		.trim()
		.refine(isLabelColor, 'Color must be a hexadecimal color or a standard CSS color name');
}

export function zodSlug() {
	return z
		.string()
		.trim()
		.max(MAX_NAME_LIMIT)
		.min(1)
		.regex(
			/^(?!admin$)(?!admin-)[^/\\?#]+$/,
			"Slug can't contain special characters: # / \\ ? and cannot begin with the word 'admin'"
		);
}
