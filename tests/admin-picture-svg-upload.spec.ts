import { expect, test } from '@playwright/test';
import { MongoClient } from 'mongodb';
import { basename } from 'path';

// Same database as the web server started by playwright.config.ts.
const E2E_DB = 'bebop-e2e';
const S3_ENDPOINT = process.env.S3_ENDPOINT_URL || 'http://localhost:9000';

const SVG_FILES = [
	// The shop's own logo: a viewBox-only export with embedded CSS.
	'src/lib/assets/bebop-light.svg',
	// An old-style file with an XML prolog and a DOCTYPE.
	'src/lib/assets/default-picture.svg',
	// Script, event handler and external references that must never survive.
	'tests/fixtures/hostile.svg'
];

async function withDb<T>(run: (db: ReturnType<MongoClient['db']>) => Promise<T>): Promise<T> {
	const client = await MongoClient.connect(process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017');
	try {
		return await run(client.db(E2E_DB));
	} finally {
		await client.close();
	}
}

// The upload goes to S3 through a presigned URL, so this needs a reachable bucket (e.g. MinIO).
test.beforeAll(async () => {
	const reachable = await fetch(S3_ENDPOINT).then(
		() => true,
		() => false
	);
	test.skip(!reachable, `No S3 endpoint at ${S3_ENDPOINT}`);
});

test.afterAll(async () => {
	await withDb((db) =>
		db
			.collection('pictures')
			.deleteMany({ name: { $in: SVG_FILES.map((file) => `${basename(file)}-0`) } })
	);
});

for (const file of SVG_FILES) {
	test(`uploading ${basename(file)} stores a PNG rendering and serves WebP`, async ({ page }) => {
		// A file chosen before hydration is missed by `bind:files` and the form then does nothing.
		await page.goto('/admin/picture/new', { waitUntil: 'networkidle' });
		await page.locator('input[type="file"]').setInputFiles(file);
		await page.locator('input[type="submit"][value="Add"]').click();
		await page.waitForURL(/\/admin\/picture$/);

		const picture = await withDb((db) =>
			db.collection('pictures').findOne({ name: `${basename(file)}-0` })
		);
		expect(picture?.storage.original.key).toMatch(/\.png$/);
		// Rounding the viewBox can cost a pixel.
		expect(
			Math.max(picture?.storage.original.width, picture?.storage.original.height)
		).toBeGreaterThanOrEqual(2046);

		const format = picture?.storage.formats[0];
		const served = await page.request.get(`/picture/raw/${picture?._id}/format/${format.width}`);
		expect(served.ok()).toBe(true);
		expect(served.headers()['content-type']).toBe('image/webp');
	});
}
