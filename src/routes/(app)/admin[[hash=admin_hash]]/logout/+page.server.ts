import { redirect } from '@sveltejs/kit';
import { actions as customerLoginActions } from '../../login/+page.server';
import { adminPrefix } from '$lib/server/admin';
import type { Actions, RequestEvent } from './$types';

export const actions: Actions = {
	default: async function (event: RequestEvent) {
		const action = customerLoginActions.clearAll;

		// @ts-expect-error different route but compatible
		await action(event);

		throw redirect(303, `${adminPrefix()}/login`);
	}
};
