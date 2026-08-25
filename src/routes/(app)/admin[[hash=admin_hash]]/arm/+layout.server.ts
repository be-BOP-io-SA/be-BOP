import { collections } from '$lib/server/database';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = () => {
	return {
		roles: collections.roles.find().sort({ createdAt: 1 }).toArray()
	};
};
