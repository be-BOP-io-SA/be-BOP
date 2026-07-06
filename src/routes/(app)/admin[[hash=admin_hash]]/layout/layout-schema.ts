import { MAX_SHORT_DESCRIPTION_LIMIT } from '$lib/types/Product';
import { z } from 'zod';

export const layoutTranslatableSchema = {
	brandName: z.string().min(1).trim().optional(),
	websiteTitle: z.string().min(1).trim().optional(),
	websiteShortDescription: z.string().min(1).max(MAX_SHORT_DESCRIPTION_LIMIT).trim().optional(),
	// `id` is a stable per-link key: link translations resolve by id (not array position), so
	// editing/reordering/deleting a main link never re-maps or drops a language's overrides.
	// Optional here because newly-added main links submit an empty id — the /admin/layout action
	// generates one. Translation rows always carry the main link's id.
	topbarLinks: z
		.array(
			z.object({
				id: z.string().trim().optional().default(''),
				href: z.string().trim(),
				label: z.string().trim()
			})
		)
		.optional(),
	footerLinks: z
		.array(
			z.object({
				id: z.string().trim().optional().default(''),
				href: z.string().trim(),
				label: z.string().trim()
			})
		)
		.optional(),
	navbarLinks: z
		.array(
			z.object({
				id: z.string().trim().optional().default(''),
				href: z.string().trim(),
				label: z.string().trim()
			})
		)
		.optional()
};
