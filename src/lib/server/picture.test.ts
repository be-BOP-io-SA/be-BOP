import { beforeEach, describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import { cleanDb } from './test-utils';
import { collections } from './database';
import { generatePicture } from './picture';

let pendingUpload: Buffer;
const storedKeys: string[] = [];

vi.mock('./s3', async (importOriginal) => {
	const original = await importOriginal<typeof import('./s3')>();
	return {
		...original,
		getPrivateS3DownloadLink: async () =>
			`data:application/octet-stream;base64,${pendingUpload.toString('base64')}`,
		getS3Client: () => ({
			deleteObject: async () => undefined,
			send: async (command: { input: { Key: string } }) => {
				storedKeys.push(command.input.Key);
			}
		})
	};
});

describe('generatePicture', () => {
	beforeEach(async () => {
		await cleanDb();
		storedKeys.length = 0;
	});

	it('turns an AVIF upload into WebP formats', async () => {
		pendingUpload = await sharp({
			create: { width: 600, height: 400, channels: 3, background: 'red' }
		})
			.avif()
			.toBuffer();
		await collections.pendingPictures.insertOne({
			_id: 'avif-picture',
			name: 'photo.avif',
			storage: {
				original: { key: 'pending/picture/avif-picture.avif', size: 1, width: 0, height: 0 },
				formats: []
			},
			createdAt: new Date(),
			updatedAt: new Date()
		});

		await generatePicture('avif-picture');

		const picture = await collections.pictures.findOne({ _id: 'avif-picture' });
		expect(picture?.storage.original).toMatchObject({ width: 600, height: 400 });
		expect(picture?.storage.formats.length).toBeGreaterThan(0);
		expect(picture?.storage.formats.every((format) => format.key.endsWith('.webp'))).toBe(true);
		expect(storedKeys).toContain(picture?.storage.original.key);
	});
});
