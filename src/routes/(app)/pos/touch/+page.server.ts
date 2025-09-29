import { runtimeConfig } from '$lib/server/runtime-config';
import { sluggifyTab } from '$lib/types/PosTabGroup.js';
import { redirect } from '@sveltejs/kit';

function defaultTab(): string {
	return sluggifyTab(runtimeConfig.posTabGroups, 0, 0);
}

export const load = async ({}) => {
	throw redirect(303, `/pos/touch/tab/${defaultTab()}`);
};
