import { redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { adminPrefix } from '$lib/server/admin';
import { runtimeConfig } from '$lib/server/runtime-config';
import { persistConfigElement } from '$lib/server/utils/persistConfig';
import { BACK_OFFICE_MODES } from '$lib/types/BackOfficeMode';

/** Switches the shop between the full back office and the PoS one, then goes back where it was. */
export async function POST({ request }) {
	const formData = await request.formData();
	const { mode, returnTo } = z
		.object({ mode: z.enum(BACK_OFFICE_MODES), returnTo: z.string().optional() })
		.parse(Object.fromEntries(formData));

	runtimeConfig.backOfficeMode = mode;
	await persistConfigElement('backOfficeMode', mode);

	// Only a path of this back office, never another site.
	const back = returnTo?.startsWith(adminPrefix()) ? returnTo : adminPrefix();
	throw redirect(303, back);
}
