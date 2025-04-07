import { CUSTOMER_ROLE_ID } from '$lib/types/User.js';
import { error, redirect } from '@sveltejs/kit';
import { adminPrefix } from '$lib/server/admin';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { runtimeConfig } from '$lib/server/runtime-config.js';

export async function load({ url, locals }) {
	if (!locals.user) {
		throw redirect(303, `${adminPrefix()}/login`);
	}

	if (locals.user.roleId === CUSTOMER_ROLE_ID) {
		throw error(403, 'This page is only accessible to administrators');
	}

	const querySchema = z.object({
		lang: z
			.string()
			.regex(/^[a-z]{2}(-[a-z]{2})?$/i, 'Invalid language format')
			.default('en')
	});

	const searchParams = Object.fromEntries(url.searchParams.entries());
	const result = querySchema.parse(searchParams);
	const { lang } = result;
	const docsPath = path.resolve('docs', lang);

	try {
		const files = fs.readdirSync(docsPath).filter((file) => file.endsWith('.md'));
		return { files, lang, adminWelcomMessage: runtimeConfig.adminWelcomMessage };
	} catch (err) {
		throw error(404, `Error while fetching file ${err}`);
	}
}
