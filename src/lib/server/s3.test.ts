import { beforeEach, describe, expect, it } from 'vitest';
import { POST as preparePicture } from '../../routes/(app)/admin[[hash=admin_hash]]/picture/prepare/+server';
import { POST as prepareDigitalFile } from '../../routes/(app)/admin[[hash=admin_hash]]/digital-file/prepare/+server';
import { runtimeConfig } from './runtime-config';
import { resetS3Clients } from './s3';
import { cleanDb } from './test-utils';

function prepareEvent(body: object) {
	return {
		request: new Request('http://localhost', { method: 'POST', body: JSON.stringify(body) })
	};
}

async function uploadUrl(response: Promise<Response>) {
	return new URL((await (await response).json()).uploadUrl);
}

function checksumParams(url: URL) {
	return [...url.searchParams].filter(([name]) => name.toLowerCase().includes('checksum'));
}

describe('presigned upload URLs', () => {
	beforeEach(async () => {
		await cleanDb();
		runtimeConfig.s3 = {
			bucket: 'bebop',
			endpointUrl: 'http://s3.test',
			publicEndpointUrl: '',
			region: 'garage',
			keyId: 'key',
			keySecret: 'secret'
		};
		await resetS3Clients().catch(() => undefined);
	});

	// The browser uploads the file later: a checksum computed now is the empty body's, and Garage
	// refuses the upload with InvalidDigest.
	it('carry no checksum for a picture', async () => {
		const url = await uploadUrl(
			preparePicture(
				prepareEvent({ fileName: 'photo.png', fileSize: 1234 }) as Parameters<
					typeof preparePicture
				>[0]
			)
		);

		expect(url.pathname).toMatch(/^\/bebop\/pending\/picture\//);
		expect(checksumParams(url)).toEqual([]);
	});

	it('carry no checksum for a digital file', async () => {
		const url = await uploadUrl(
			prepareDigitalFile(
				prepareEvent({ name: 'Manual', fileName: 'manual.pdf', fileSize: 1234 }) as Parameters<
					typeof prepareDigitalFile
				>[0]
			)
		);

		expect(url.pathname).toMatch(/^\/bebop\/digital-files\//);
		expect(checksumParams(url)).toEqual([]);
	});
});
