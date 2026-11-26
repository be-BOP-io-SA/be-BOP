import { runtimeConfig } from '$lib/server/runtime-config';
import { sluggifyTab } from '$lib/types/PosTabGroup.js';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

function defaultTab(): string {
	return sluggifyTab(runtimeConfig.posTabGroups, 0, 0);
}

export const load: PageServerLoad = async ({}) => {
	throw redirect(303, `/pos/touch/tab/${defaultTab()}`);
};
