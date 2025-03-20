import { MAX_CONTENT_LIMIT } from '$lib/types/CmsPage';
import { MAX_NAME_LIMIT, MAX_SHORT_DESCRIPTION_LIMIT } from '$lib/types/Product';
import { z } from 'zod';

export const cmsTranslatableSchema = {
	title: z.string().min(1).max(MAX_NAME_LIMIT),
	content: z.string().max(MAX_CONTENT_LIMIT),
	shortDescription: z.string().max(MAX_SHORT_DESCRIPTION_LIMIT),
	mobileContent: z.string().max(MAX_CONTENT_LIMIT).optional(),
	employeeContent: z.string().max(MAX_CONTENT_LIMIT).optional()
};
