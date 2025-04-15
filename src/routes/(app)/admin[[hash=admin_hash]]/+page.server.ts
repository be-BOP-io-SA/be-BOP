import fs from 'fs';
import { join } from 'path';
import { redirect, error } from '@sveltejs/kit';
import { z } from 'zod';
import { adminPrefix } from '$lib/server/admin';
import { CUSTOMER_ROLE_ID } from '$lib/types/User';
import { runtimeConfig } from '$lib/server/runtime-config';
import { rootDir } from '$lib/server/root-dir.js';

export async function load({ url, locals }) {
	if (!locals.user) {
		throw redirect(303, `${adminPrefix()}/login`);
	}

	if (locals.user.roleId === CUSTOMER_ROLE_ID) {
		throw error(403, 'This page is only accessible to administrators');
	}

	const docsRootPath = join(rootDir, 'docs');
	const validFolderNameRegex = /^[a-z]{2}(-[a-z]{2})?$/i;
	const availableLangs = fs
		.readdirSync(docsRootPath, { withFileTypes: true })
		.filter((entry) => validFolderNameRegex.test(entry.name) && entry.isDirectory())
		.map((entry) => entry.name);

	if (availableLangs.length === 0) {
		throw error(500, 'No documentation folders available');
	}

	const querySchema = z.object({
		lang: z.enum(availableLangs as [string, ...string[]]).default('en')
	});

	const searchParams = Object.fromEntries(url.searchParams.entries());
	const result = querySchema.safeParse(searchParams);

	if (!result.success) {
		throw error(400, 'Invalid lang param. Allowed values: ' + availableLangs.join(', '));
	}

	const { lang } = result.data;
	const docsPath = join(docsRootPath, lang);

	try {
		const files = fs.readdirSync(docsPath).filter((file) => file.endsWith('.md'));
		return {
			files,
			lang,
			adminWelcomMessage: runtimeConfig.adminWelcomMessage
		};
	} catch (err) {
		console.error(`Error reading files from docs/${lang}`, err);
		throw error(404, `Unable to load documentation files for "${lang}"`);
	}
}
