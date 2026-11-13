import { collections } from '$lib/server/database.js';
import { runtimeConfig } from '$lib/server/runtime-config';
import { resetTransporter } from '$lib/server/email.js';
import { z } from 'zod';
import { type Actions, type RequestEvent } from '@sveltejs/kit';
import {
	SMTP_FAKE,
	SMTP_HOST,
	SMTP_PORT,
	SMTP_USER,
	SMTP_PASSWORD,
	SMTP_FROM
} from '$lib/server/env-config';
import { persistConfigElement } from '$lib/server/utils/persistConfig';

function defaultSmtpSettings() {
	return {
		host: '',
		port: 587,
		user: '',
		password: '',
		from: '',
		fake: true
	};
}

function projectSettingsForFrontend(config: typeof runtimeConfig.smtp) {
	const { password, ...smtpConfig } = { ...config, passwordIsSet: false };
	smtpConfig.passwordIsSet = !!password;
	return smtpConfig;
}

function settingsEnforcedByEnvVars(): boolean {
	return !!(SMTP_FAKE || SMTP_HOST || SMTP_PORT || SMTP_USER || SMTP_PASSWORD || SMTP_FROM);
}

export async function load() {
	return {
		smtp: projectSettingsForFrontend(runtimeConfig.smtp),
		defaultSmtpSettings: projectSettingsForFrontend(defaultSmtpSettings()),
		settingsEnforcedByEnvVars: settingsEnforcedByEnvVars()
	};
}

export const actions: Actions = {
	save: async function ({ request }: RequestEvent) {
		const requestData = Object.fromEntries(await request.formData());
		const { fake } = z
			.object({
				fake: z.boolean({ coerce: true }).optional().default(false)
			})
			.parse(requestData);

		const existingSettings = runtimeConfig.smtp;

		let updated;
		if (fake) {
			updated = { ...existingSettings, fake: true };
		} else {
			const smtp = z
				.object({
					host: z.string().trim(),
					port: z.coerce.number().int().min(1).max(65535),
					user: z.string().trim(),
					password: z.string(),
					from: z.string().trim()
				})
				.parse(requestData);
			const password = smtp.password || existingSettings.password;
			updated = { ...existingSettings, ...smtp, password, fake: false };
		}
		persistConfigElement('smtp', updated);
		runtimeConfig.smtp = updated;
		resetTransporter();
	},
	delete: async function () {
		await collections.runtimeConfig.deleteOne({
			_id: 'smtp'
		});
		runtimeConfig.smtp = defaultSmtpSettings();
		resetTransporter();
	}
};
