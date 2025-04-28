import { RuntimeConfig } from './runtime-config';
import * as client from 'openid-client';

const configs: Record<string, client.Configuration> = {};

export async function oauthConfig(
	oauth: RuntimeConfig['oauth'][number],
	fetch: typeof globalThis.fetch
): Promise<client.Configuration> {
	const key = `${oauth.clientId}-${oauth.clientSecret}-${oauth.issuer}-${oauth.slug}`;

	const config =
		configs[key] ??
		(await client.discovery(new URL(oauth.issuer), oauth.clientId, oauth.clientSecret, undefined, {
			[client.customFetch]: fetch
		}));

	configs[key] = config;

	return config;
}
