import { lookup } from 'dns/promises';
import { isIP } from 'net';
import { isPrivateIp } from './webhook-url-guard';
import { runtimeConfig } from './runtime-config';

function isShopS3Endpoint(url: URL): boolean {
	return [runtimeConfig.s3.endpointUrl, runtimeConfig.s3.publicEndpointUrl].some((endpoint) => {
		try {
			return !!endpoint && new URL(endpoint).origin === url.origin;
		} catch {
			return false;
		}
	});
}

/**
 * The source URL is authored by the backup file too, so fetching it unchecked turns the import
 * into a read proxy into our own network — the fetched bytes end up publicly served under
 * `/picture/raw`. Unlike a webhook target, http is allowed: an S3-compatible store on the LAN is
 * a normal deployment, so only the address is vetted, not the scheme.
 */
export async function assertPublicImportSource(rawUrl: string): Promise<void> {
	const url = new URL(rawUrl);

	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		throw new Error(`Refusing to import from a non-http(s) URL: ${url.protocol}`);
	}

	// The shop's own store is where its exported pictures live, and it often sits on the LAN.
	if (isShopS3Endpoint(url)) {
		return;
	}

	const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');

	if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) {
		throw new Error(`Refusing to import from ${host}`);
	}

	if (isIP(host)) {
		if (isPrivateIp(host)) {
			throw new Error(`Refusing to import from a private address: ${host}`);
		}
		return;
	}

	for (const { address } of await lookup(host, { all: true })) {
		if (isPrivateIp(address)) {
			throw new Error(`Refusing to import from ${host}, which resolves to ${address}`);
		}
	}
}
