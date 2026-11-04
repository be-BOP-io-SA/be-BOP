import { expect, test, type Page } from '@playwright/test';

// A tiny valid PNG: the storage refuses it before reading it anyway.
const PNG = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
	'base64'
);

function recordDialogs(page: Page): string[] {
	const messages: string[] = [];
	page.on('dialog', async (dialog) => {
		messages.push(dialog.message());
		await dialog.accept();
	});
	return messages;
}

async function submitPicture(page: Page, buffer = PNG) {
	await page.goto('/admin/picture/new', { waitUntil: 'networkidle' });
	await page
		.locator('input[type="file"]')
		.setInputFiles({ name: 'refused.png', mimeType: 'image/png', buffer });
	await page.locator('input[type="submit"]').click();
}

test('a picture over 20 MB is refused before anything is sent', async ({ page }) => {
	const dialogs = recordDialogs(page);
	const prepared: string[] = [];
	page.on('request', (request) => {
		if (request.url().includes('/picture/prepare')) {
			prepared.push(request.url());
		}
	});

	await submitPicture(page, Buffer.alloc(20_000_001));

	await expect
		.poll(() => dialogs)
		.toEqual(['The picture is larger than 20 MB. Choose a smaller file.']);
	expect(prepared).toEqual([]);
	await expect(page.locator('input[type="submit"]')).toBeEnabled();
});

test('an expired session is named as such, not as a storage problem', async ({ page, context }) => {
	const dialogs = recordDialogs(page);
	await page.goto('/admin/picture/new', { waitUntil: 'networkidle' });
	await page
		.locator('input[type="file"]')
		.setInputFiles({ name: 'late.png', mimeType: 'image/png', buffer: PNG });
	await context.clearCookies();
	await page.locator('input[type="submit"]').click();

	await expect
		.poll(() => dialogs)
		.toEqual(['Your session has expired. Log in again, then send the picture again.']);
});

test('a digital file the storage refuses gets a readable message', async ({ page }) => {
	const dialogs = recordDialogs(page);
	await page.route('**/digital-files/**', (route) => route.abort('failed'));

	await page.goto('/admin/digital-file/new', { waitUntil: 'networkidle' });
	await page.locator('input[name="name"]').fill('E2E refused file');
	await page
		.locator('input[type="file"]')
		.setInputFiles({ name: 'refused.pdf', mimeType: 'application/pdf', buffer: PNG });
	await page.locator('input[type="submit"]').click();

	await expect
		.poll(() => dialogs)
		.toEqual(['The file could not be sent to the storage. Check the S3 settings, then try again.']);
	await expect(page).toHaveURL(/\/admin\/digital-file\/new$/);
});

test('a picture the storage refuses is reported, and the form can be sent again', async ({
	page
}) => {
	const dialogs = recordDialogs(page);
	// What a browser sees when the storage answers an error without CORS headers.
	await page.route('**/pending/picture/**', (route) => route.abort('failed'));

	await submitPicture(page);

	await expect
		.poll(() => dialogs)
		.toEqual([
			'The picture could not be sent to the storage. Check the S3 settings, then try again.'
		]);
	await expect(page).toHaveURL(/\/admin\/picture\/new$/);
	await expect(page.locator('input[type="submit"]')).toBeEnabled();
});

test.describe('in French', () => {
	test.use({ locale: 'fr-FR' });

	test('the refusal is translated', async ({ page }) => {
		const dialogs = recordDialogs(page);
		await page.route('**/pending/picture/**', (route) =>
			route.fulfill({
				status: 400,
				contentType: 'application/xml',
				body: '<Error><Code>InvalidDigest</Code></Error>'
			})
		);

		await submitPicture(page);

		await expect
			.poll(() => dialogs)
			.toEqual([
				"L'image n'a pas pu être envoyée vers le stockage. Vérifiez les réglages S3, puis réessayez."
			]);
		await expect(page).toHaveURL(/\/admin\/picture\/new$/);
	});
});
