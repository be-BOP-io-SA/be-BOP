import { collections } from '$lib/server/database';
import { userIdentifier, userQuery } from '$lib/server/user';

export const load = async ({ locals }) => {
	await collections.carts.deleteMany(userQuery(userIdentifier(locals)));
};
