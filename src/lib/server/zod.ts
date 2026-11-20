import { MAX_NAME_LIMIT } from '$lib/types/Product';
import { z } from 'zod';

export function zodObjectId(): z.ZodString {
	return z.string().regex(/^[a-f0-9]{24}$/i);
}

export function zodSlug(): z.ZodString {
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
