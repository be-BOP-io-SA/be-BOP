import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { assertPublicImportSource } from './backup-import-source';
import { runtimeConfig } from './runtime-config';

describe('assertPublicImportSource', () => {
	const s3 = structuredClone(runtimeConfig.s3);

	beforeEach(() => {
		runtimeConfig.s3.endpointUrl = 'http://192.168.1.10:9000';
		runtimeConfig.s3.publicEndpointUrl = 'http://10.0.0.5:9000/';
	});
	afterEach(() => {
		runtimeConfig.s3 = structuredClone(s3);
	});

	it.each([
		'http://192.168.1.10:9000/shop/pictures/a.png?X-Amz-Signature=x',
		'http://10.0.0.5:9000/shop/pictures/a.png'
	])("accepts the shop's own S3 store at %s", async (url) => {
		await expect(assertPublicImportSource(url)).resolves.toBeUndefined();
	});

	it.each([
		['another host of the network', 'http://192.168.1.11:9000/shop/pictures/a.png'],
		['another port of the S3 host', 'http://192.168.1.10:22/shop/pictures/a.png'],
		['the loopback', 'http://127.0.0.1:9000/shop/pictures/a.png']
	])('refuses %s', async (_, url) => {
		await expect(assertPublicImportSource(url)).rejects.toThrow('Refusing to import from');
	});

	it('refuses a private address when no S3 endpoint is set', async () => {
		runtimeConfig.s3.endpointUrl = '';
		runtimeConfig.s3.publicEndpointUrl = '';

		await expect(
			assertPublicImportSource('http://192.168.1.10:9000/shop/pictures/a.png')
		).rejects.toThrow('Refusing to import from a private address: 192.168.1.10');
	});
});
