import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readdirSync } from 'fs';
import sharp from 'sharp';
import { cleanDb } from '$lib/server/test-utils';
import { collections } from '$lib/server/database';
import { runtimeConfig } from '$lib/server/runtime-config';
import {
	DEFAULT_PICTURES,
	replaceDefaultPicture,
	type DefaultPictureFile
} from '$lib/server/default-picture';
import { GET } from './+server';

// A release install ships the build without the source tree, so src/lib/assets is missing.
vi.mock('$lib/server/root-dir', async () => {
	const { mkdtempSync, writeFileSync } = await import('fs');
	const { tmpdir } = await import('os');
	const { join } = await import('path');
	const releaseDir = mkdtempSync(join(tmpdir(), 'bebop-release-'));
	writeFileSync(join(releaseDir, 'package.json'), '{}');
	return { rootDir: releaseDir };
});

const stored = new Set<string>();

vi.mock('$lib/server/s3', async (importOriginal) => {
	const original = await importOriginal<typeof import('$lib/server/s3')>();
	return {
		...original,
		getPublicS3DownloadLink: async (key: string) => `https://s3.test/${key}`,
		getS3Client: () => ({
			send: async (command: { constructor: { name: string }; input: { Key: string } }) => {
				if (command.constructor.name === 'DeleteObjectCommand') {
					stored.delete(command.input.Key);
				} else {
					stored.add(command.input.Key);
				}
			}
		})
	};
});

async function served(filename: string) {
	try {
		await GET({ params: { filename } } as Parameters<typeof GET>[0]);
	} catch (thrown) {
		const { status, location } = thrown as { status: number; location?: string };
		return { status, location };
	}
	throw new Error('GET neither redirected nor failed');
}

async function upload(file: DefaultPictureFile, background: string) {
	const png = await sharp({ create: { width: 64, height: 48, channels: 3, background } })
		.png()
		.toBuffer();
	const body = new FormData();
	body.set('file', new File([png], 'picture.png', { type: 'image/png' }));
	await replaceDefaultPicture(file, new Request('http://localhost', { method: 'POST', body }));
}

describe('/asset/[filename]', () => {
	beforeEach(async () => {
		await cleanDb();
		stored.clear();
		runtimeConfig.defaultProductPictureId = '';
		runtimeConfig.defaultEventPictureId = '';
	});

	for (const [file, { bundled }] of Object.entries(DEFAULT_PICTURES)) {
		it(`serves the bundled ${file} without the source tree`, async () => {
			expect(await served(file)).toEqual({ status: 302, location: bundled });
			expect(bundled).not.toMatch(/^data:/);
		});

		it(`serves an uploaded ${file} from storage, and the bundled one once it is deleted`, async () => {
			await upload(file as DefaultPictureFile, 'red');
			const { configKey } = DEFAULT_PICTURES[file as DefaultPictureFile];
			const picture = await collections.pictures.findOne({ _id: runtimeConfig[configKey] });

			expect(await served(file)).toEqual({
				status: 302,
				location: `https://s3.test/${picture?.storage.formats[0].key}`
			});
			expect(await collections.runtimeConfig.findOne({ _id: configKey })).toMatchObject({
				data: picture?._id
			});

			await collections.pictures.deleteOne({ _id: picture?._id });
			expect(await served(file)).toEqual({ status: 302, location: bundled });
		});
	}

	it('removes the previous upload when the default picture is replaced', async () => {
		await upload('default-picture.png', 'red');
		const first = runtimeConfig.defaultProductPictureId;
		await upload('default-picture.png', 'blue');

		expect(await collections.pictures.countDocuments({ _id: first })).toBe(0);
		expect(await collections.pictures.countDocuments()).toBe(1);
		expect([...stored].some((key) => key.includes(first))).toBe(false);
	});

	it('serves every other bundled asset from the build', async () => {
		const others = readdirSync('src/lib/assets').filter((file) => !(file in DEFAULT_PICTURES));
		expect(others).toContain('bebop-light.svg');

		for (const file of others) {
			expect(await served(file)).toEqual({ status: 302, location: `/src/lib/assets/${file}` });
		}
	});

	it('serves nothing else', async () => {
		expect(await served('missing.png')).toMatchObject({ status: 404 });
		expect(await served('../../package.json')).toMatchObject({ status: 404 });
	});
});
