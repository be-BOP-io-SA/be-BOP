import { redirect } from '@sveltejs/kit';
import { adminPrefix } from '$lib/server/admin';
import { replaceDefaultPicture } from '$lib/server/default-picture';

export const actions = {
	default: async ({ request }) => {
		await replaceDefaultPicture('event-default-picture.png', request);

		throw redirect(303, `${adminPrefix()}/schedule`);
	}
};
