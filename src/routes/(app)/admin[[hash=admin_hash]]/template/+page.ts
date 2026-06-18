import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
	const res = await parent();
	throw redirect(303, `${res.adminPrefix}/template/emails`);
};
