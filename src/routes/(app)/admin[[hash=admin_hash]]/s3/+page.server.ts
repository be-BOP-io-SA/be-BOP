import {
	S3_BUCKET,
	S3_ENDPOINT_URL,
	PUBLIC_S3_ENDPOINT_URL,
	S3_REGION,
	S3_KEY_ID,
	S3_KEY_SECRET
} from '$lib/server/env-config';
import { runtimeConfig } from '$lib/server/runtime-config';
import { resetS3Clients } from '$lib/server/s3.js';
import { z } from 'zod';
import type { Actions, RequestEvent } from '@sveltejs/kit';
import { persistConfigElement } from '$lib/server/utils/persistConfig';

function projectSettingsForFrontend(base: typeof runtimeConfig.s3) {
	const { keySecret, ...config } = { ...base, keySecretIsSet: false };
	config.keySecretIsSet = !!keySecret;
	return config;
}

function settingsEnforcedByEnvVars(): boolean {
	return !!(
		S3_BUCKET ||
		S3_ENDPOINT_URL ||
		PUBLIC_S3_ENDPOINT_URL ||
		S3_REGION ||
		S3_KEY_ID ||
		S3_KEY_SECRET
	);
}

export async function load() {
	return {
		s3: projectSettingsForFrontend(runtimeConfig.s3),
		settingsEnforcedByEnvVars: settingsEnforcedByEnvVars()
	};
}

async function parseForm(request: Request) {
	return z
		.object({
			bucket: z.string().trim(),
			endpointUrl: z.string().trim(),
			publicEndpointUrl: z.string().trim(),
			region: z.string().trim(),
			keyId: z.string().trim(),
			keySecret: z.string().optional()
		})
		.parse(Object.fromEntries(await request.formData()));
}

async function simpleListTest(s3: typeof runtimeConfig.s3) {
	try {
		const { S3Client, ListBucketsCommand } = await import('@aws-sdk/client-s3');
		const client = new S3Client({
			region: s3.region || 'us-east-1' /* “Harmless” region for providers who don't care */,
			endpoint: s3.endpointUrl,
			credentials: {
				accessKeyId: s3.keyId,
				secretAccessKey: s3.keySecret
			}
		});
		await client.send(new ListBucketsCommand({}));
		return { testResult: { success: true, message: 'S3 connection successful!' } };
	} catch (error) {
		return {
			testResult: {
				success: false,
				message: `S3 connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
			}
		};
	}
}

function sameRemote(s3: Pick<typeof runtimeConfig.s3, 'endpointUrl' | 'publicEndpointUrl'>) {
	return (
		s3.endpointUrl === runtimeConfig.s3.endpointUrl &&
		(!s3.publicEndpointUrl || s3.publicEndpointUrl === runtimeConfig.s3.publicEndpointUrl)
	);
}

export const actions: Actions = {
	save: async function ({ request }: RequestEvent) {
		const parsedS3 = await parseForm(request);
		const s3 = {
			...parsedS3,
			keySecret: parsedS3.keySecret || (sameRemote(parsedS3) ? runtimeConfig.s3.keySecret : '')
		};
		const { testResult } = await simpleListTest(s3);
		if (testResult.success) {
			await persistConfigElement('s3', s3);
			runtimeConfig.s3 = s3;
			await resetS3Clients();
			return { actionResult: { success: true, message: 'S3 configuration updated!' } };
		} else {
			return { actionResult: testResult };
		}
	},
	test: async function ({ request }: RequestEvent) {
		const parsedS3 = await parseForm(request);
		const s3 = {
			...parsedS3,
			keySecret: parsedS3.keySecret || (sameRemote(parsedS3) ? runtimeConfig.s3.keySecret : '')
		};
		return { actionResult: (await simpleListTest(s3)).testResult };
	}
};
