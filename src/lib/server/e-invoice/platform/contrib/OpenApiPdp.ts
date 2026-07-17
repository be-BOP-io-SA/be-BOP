import { addSeconds } from 'date-fns';
import { runtimeConfig } from '$lib/server/runtime-config';
import type { EInvoicePlatform } from '../types';

/**
 * Generic adapter for any accredited platform (PDP) exposing the common
 * French e-invoicing OpenAPI shape: OAuth2 client_credentials at
 * `/oauth2/token`, and `POST/GET /v1.beta/invoices` for submission and
 * status tracking. Base URL and credentials are admin-configurable
 * (`runtimeConfig.openApiPdp`), so the same adapter works against any
 * platform implementing that shape (e.g. SUPER PDP's sandbox at
 * https://api.superpdp.tech) without code changes.
 */

/** `fr:*`/`api:*` status codes that mean the invoice was refused end to end. */
const REJECTED_STATUS_CODES = new Set([
	'api:rejected',
	'api:invalid',
	'fr:210',
	'fr:213',
	'fr:501'
]);

/** `fr:*`/`api:*` status codes that mean the invoice was accepted by the recipient. */
const ACCEPTED_STATUS_CODES = new Set(['api:accepted', 'fr:205', 'fr:206', 'fr:209']);

let cachedToken: string | null = null;
let tokenExpiresAt: Date | null = null;
let credentialsUsedForToken: string | null = null;

function baseUrl(): string {
	return runtimeConfig.openApiPdp.baseUrl.replace(/\/+$/, '');
}

/**
 * Get an OAuth2 client_credentials access token for the configured PDP.
 *
 * Mirrors `paypalAccessToken` (src/lib/server/paypal.ts): cached locally
 * depending on expiration, so call it every time instead of storing the
 * token in a variable, to ensure it's always fresh.
 */
export async function openApiPdpAccessToken(): Promise<string> {
	const credentials = `${baseUrl()}|${runtimeConfig.openApiPdp.clientId}:${
		runtimeConfig.openApiPdp.clientSecret
	}`;

	if (
		cachedToken &&
		tokenExpiresAt &&
		credentialsUsedForToken === credentials &&
		tokenExpiresAt > new Date()
	) {
		return cachedToken;
	}

	const response = await fetch(`${baseUrl()}/oauth2/token`, {
		method: 'POST',
		headers: {
			Authorization: `Basic ${Buffer.from(
				`${runtimeConfig.openApiPdp.clientId}:${runtimeConfig.openApiPdp.clientSecret}`
			).toString('base64')}`,
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: 'grant_type=client_credentials'
	});

	if (!response.ok) {
		throw new Error(`Failed to get PDP access token: ${response.status} ${response.statusText}`);
	}

	const data: { access_token: string; expires_in: number } = await response.json();

	cachedToken = data.access_token;
	tokenExpiresAt = addSeconds(new Date(), data.expires_in - 10);
	credentialsUsedForToken = credentials;

	return data.access_token;
}

export const OpenApiPdp: EInvoicePlatform = {
	meta: {
		id: 'openapi',
		label: 'OpenAPI PDP',
		countries: ['FR']
	},

	isConfigured() {
		return (
			!!runtimeConfig.openApiPdp.baseUrl &&
			!!runtimeConfig.openApiPdp.clientId &&
			!!runtimeConfig.openApiPdp.clientSecret
		);
	},

	async submitInvoice(einvoice, { pdf }) {
		const token = await openApiPdpAccessToken();
		const url = new URL(`${baseUrl()}/v1.beta/invoices`);
		url.searchParams.set('external_id', einvoice._id.toString());

		const response = await fetch(url, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/pdf'
			},
			body: pdf
		});

		const json = await response.json();
		if (!response.ok) {
			throw new Error(json.message ?? `PDP invoice submission failed: ${response.status}`);
		}

		return { status: 'submitted', externalId: String(json.id) };
	},

	async checkStatus(einvoice) {
		if (!einvoice.transmission.externalId) {
			return { status: einvoice.transmission.status };
		}

		const token = await openApiPdpAccessToken();
		const response = await fetch(
			`${baseUrl()}/v1.beta/invoices/${einvoice.transmission.externalId}`,
			{
				headers: { Authorization: `Bearer ${token}` }
			}
		);

		const json = await response.json();
		if (!response.ok) {
			throw new Error(json.message ?? `PDP status check failed: ${response.status}`);
		}

		const statusCodes: string[] = (json.events ?? []).map(
			(event: { status_code: string }) => event.status_code
		);

		if (statusCodes.some((code) => REJECTED_STATUS_CODES.has(code))) {
			return { status: 'rejected' };
		}
		if (statusCodes.some((code) => ACCEPTED_STATUS_CODES.has(code))) {
			return { status: 'accepted' };
		}
		return { status: 'submitted' };
	}
};
