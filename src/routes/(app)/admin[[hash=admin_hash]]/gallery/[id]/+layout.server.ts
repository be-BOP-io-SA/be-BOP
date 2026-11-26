import { collections } from '$lib/server/database.js';
import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params }) => {
	const gallery = await collections.galleries.findOne({ _id: params.id });

	if (!gallery) {
		throw error(404, 'gallery not found');
	}

	return {
		gallery
	};
};
