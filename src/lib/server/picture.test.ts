import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'fs';
import sharp from 'sharp';
import { cleanDb } from './test-utils';
import { collections } from './database';
import { generatePicture } from './picture';

let pendingUpload: Buffer;
const stored = new Map<string, { body: Buffer; contentType: string }>();

vi.mock('./s3', async (importOriginal) => {
	const original = await importOriginal<typeof import('./s3')>();
	return {
		...original,
		getPrivateS3DownloadLink: async () =>
			`data:application/octet-stream;base64,${pendingUpload.toString('base64')}`,
		getS3Client: () => ({
			deleteObject: async () => undefined,
			send: async (command: { input: { Key: string; Body: Uint8Array; ContentType: string } }) => {
				stored.set(command.input.Key, {
					body: Buffer.from(command.input.Body),
					contentType: command.input.ContentType
				});
			}
		})
	};
});

async function upload(fileName: string, content: Buffer) {
	pendingUpload = content;
	await collections.pendingPictures.insertOne({
		_id: 'uploaded-picture',
		name: fileName,
		storage: {
			original: { key: `pending/picture/${fileName}`, size: content.length, width: 0, height: 0 },
			formats: []
		},
		createdAt: new Date(),
		updatedAt: new Date()
	});
	await generatePicture('uploaded-picture');

	const picture = await collections.pictures.findOne({ _id: 'uploaded-picture' });
	if (!picture) {
		throw new Error('picture not created');
	}
	return picture;
}

describe('generatePicture', () => {
	beforeEach(async () => {
		await cleanDb();
		stored.clear();
	});

	it('turns an AVIF upload into WebP formats', async () => {
		const picture = await upload(
			'photo.avif',
			await sharp({ create: { width: 600, height: 400, channels: 3, background: 'red' } })
				.avif()
				.toBuffer()
		);

		expect(picture.storage.original).toMatchObject({ width: 600, height: 400 });
		expect(picture.storage.formats.length).toBeGreaterThan(0);
		expect(picture.storage.formats.every((format) => format.key.endsWith('.webp'))).toBe(true);
	});

	it.each([
		// A logo exported with a viewBox only, no width or height.
		['bebop-light.svg', 'src/lib/assets/bebop-light.svg'],
		// An old-style file with an XML prolog and a DOCTYPE.
		['default-picture.svg', 'src/lib/assets/default-picture.svg']
	])('keeps a sharp PNG rendering of %s, never the SVG', async (name, path) => {
		const svg = readFileSync(path);
		const { width: svgWidth = 0, height: svgHeight = 0 } = await sharp(svg).metadata();

		const { original, formats } = (await upload(name, svg)).storage;

		// Rounding the viewBox can cost a pixel.
		expect(Math.max(original.width, original.height)).toBeGreaterThanOrEqual(2046);
		expect(original.width / original.height).toBeCloseTo(svgWidth / svgHeight, 2);
		expect(original.key).toMatch(/\.png$/);
		expect(stored.get(original.key)?.contentType).toBe('image/png');
		expect([...stored.values()].some((file) => file.contentType.includes('svg'))).toBe(false);
		expect(formats.length).toBeGreaterThan(0);
	});

	it('renders a tiny wide logo large enough to stay sharp', async () => {
		const logo = Buffer.from(
			'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 176 33"><rect width="176" height="33" fill="#770C56"/></svg>'
		);

		const picture = await upload('logotype.svg', logo);

		expect(picture.storage.original.width).toBe(2048);
	});

	it('keeps no trace of the script a hostile SVG carries', async () => {
		const hostile =
			Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="200" height="100" onload="alert(1)">
			<script>alert(document.domain)</script>
			<image href="file:///etc/passwd" width="10" height="10"/>
			<image xlink:href="http://127.0.0.1:9/probe.png" width="10" height="10"/>
			<rect width="200" height="100" fill="#3a3"/>
		</svg>`);

		const picture = await upload('hostile.svg', hostile);

		expect(picture.storage.original.key).toMatch(/\.png$/);
		for (const file of stored.values()) {
			expect(file.body.includes('alert')).toBe(false);
			expect(file.contentType).not.toContain('svg');
		}
	});
});
