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

async function submitPicture(page: Page) {
	await page.goto('/admin/picture/new', { waitUntil: 'networkidle' });
	await page
		.locator('input[type="file"]')
		.setInputFiles({ name: 'refused.png', mimeType: 'image/png', buffer: PNG });
	await page.locator('input[type="submit"]').click();
}

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
