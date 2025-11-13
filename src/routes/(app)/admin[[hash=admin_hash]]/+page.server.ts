import fs from 'fs';
import { join } from 'path';
import { redirect, error } from '@sveltejs/kit';
import { z } from 'zod';
import { adminPrefix } from '$lib/server/admin';
import { CUSTOMER_ROLE_ID } from '$lib/types/User';
import { runtimeConfig } from '$lib/server/runtime-config';
import { rootDir } from '$lib/server/root-dir.js';
import { enableTelemetry, disableTelemetry } from '$lib/server/telemetry-helpers';

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
	const result = querySchema.parse(searchParams);

	const docsPath = join(docsRootPath, result.lang);

	try {
		const files = fs.readdirSync(docsPath).filter((file) => file.endsWith('.md'));
		const telemetryConfig = runtimeConfig.telemetry;

		// Show banner if:
		// 1. Never configured (first time) OR
		// 2. Beacon disabled AND has reminder date AND date has passed
		// Note: nextPrompt=null means "never ask again" (don't show banner)
		const showTelemetryBanner =
			!telemetryConfig ||
			(!telemetryConfig.enabled &&
				telemetryConfig.nextPrompt !== null &&
				new Date() >= telemetryConfig.nextPrompt);

		return {
			files,
			lang: result.lang,
			adminWelcomMessage: runtimeConfig.adminWelcomMessage,
			showTelemetryBanner
		};
	} catch (err) {
		console.error(`Error reading files from docs/${result.lang}`, err);
		throw error(404, `Unable to load documentation files for "${result.lang}"`);
	}
}

const TELEMETRY_CHOICES = ['accept', 'decline', 'hide'] as const;

export const actions = {
	telemetry: async ({ request }) => {
		const formData = await request.formData();

		const schema = z.object({
			choice: z.enum(TELEMETRY_CHOICES)
		});

		const { choice } = schema.parse({
			choice: formData.get('choice')
		});

		switch (choice) {
			case 'accept':
				await enableTelemetry({ forceBeaconNow: true, source: 'admin banner' });
				break;
			case 'decline':
				await disableTelemetry({ neverAskAgain: false, source: 'admin banner' });
				break;
			case 'hide':
				await disableTelemetry({ neverAskAgain: true, source: 'admin banner' });
				break;
			default:
				choice satisfies never;
		}

		return { success: true };
	}
};
