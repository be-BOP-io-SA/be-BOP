import { collections } from '$lib/server/database.js';
import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params }) => {
	const tag = await collections.tags.findOne({ _id: params.id });

	if (!tag) {
		throw error(404, 'tag not found');
	}

	return {
		tag
	};
};
