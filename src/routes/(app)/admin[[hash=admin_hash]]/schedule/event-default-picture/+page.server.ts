import { redirect } from '@sveltejs/kit';
import { adminPrefix } from '$lib/server/admin';
import { replaceDefaultPicture } from '$lib/server/default-picture';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request }) => {
		await replaceDefaultPicture('event-default-picture.png', request);

		throw redirect(303, `${adminPrefix()}/schedule`);
	}
};
