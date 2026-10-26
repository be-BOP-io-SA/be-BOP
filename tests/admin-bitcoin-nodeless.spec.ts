import { expect, test, type Page } from '@playwright/test';
import { MongoClient } from 'mongodb';

// Same database as the web server started by playwright.config.ts.
const E2E_DB = 'bebop-e2e';
const ZPUB =
	'zpub6r8LffkeFh5if3FefxX5zq5oQnQbLxXXPE87fEskLhY2v37Tj16TzMqRL7p32wQweeq1DpRYWrvm4t3ArKHrLNnVhPkFsHGdo3h6nyoppeS';
const LAST_INDEX = 2 ** 31 - 1;

async function withDb<T>(run: (db: ReturnType<MongoClient['db']>) => Promise<T>): Promise<T> {
	const client = await MongoClient.connect(process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017');
	try {
		return await run(client.db(E2E_DB));
	} finally {
		await client.close();
	}
}

// The server picks the change up through its runtime config change stream.
async function storeNodelessConfig(publicKey: string, derivationIndex: number) {
	await withDb((db) =>
		db.collection<{ _id: string }>('runtimeConfig').updateOne(
			{ _id: 'bitcoinNodeless' },
			{
				$set: {
					data: {
						format: 'bip84',
						publicKey,
						// Unreachable, so the used-address check fails fast instead of calling mempool.space.
						mempoolUrl: 'http://127.0.0.1:9',
						derivationIndex,
						skipUsedAddresses: false,
						derivationPath: "m/84'/0'/0'"
					},
					updatedAt: new Date()
				}
			},
			{ upsert: true }
		)
	);
}

async function storedNodelessConfig() {
	return withDb((db) =>
		db.collection<{ _id: string }>('runtimeConfig').findOne({ _id: 'bitcoinNodeless' })
	);
}

async function fillSetupForm(page: Page, derivationIndex: string) {
	await page.goto('/admin/bitcoin-nodeless');
	// Neither case saves anything, so the page is always on its first-time set-up form.
	await expect(page.getByRole('button', { name: 'Set up' })).toBeVisible();
	await page.locator('input[name="publicKey"]').fill(ZPUB);
	await page.locator('input[name="derivationIndex"]').fill(derivationIndex);
}

test('the browser stops a negative derivation index before submitting', async ({ page }) => {
	await fillSetupForm(page, '-1');
	await page.getByRole('button', { name: 'Set up' }).click();

	const isValid = await page
		.locator('input[name="derivationIndex"]')
		.evaluate((input: HTMLInputElement) => input.validity.valid);
	expect(isValid).toBe(false);
	await expect(page.getByRole('button', { name: 'Set up' })).toBeVisible();
});

test('the server refuses a decimal derivation index the browser let through', async ({ page }) => {
	await fillSetupForm(page, '1.5');
	// Stand in for a client that ignores the input's bounds.
	await page
		.locator('form', { has: page.locator('input[name="derivationIndex"]') })
		.evaluate((form: HTMLFormElement) => form.setAttribute('novalidate', ''));
	await page.getByRole('button', { name: 'Set up' }).click();

	await expect(page.getByText('Expected integer, received float')).toBeVisible();
	await page.reload();
	await expect(page.getByRole('button', { name: 'Set up' })).toBeVisible();
});

test.describe('a key at the end of its derivation range', () => {
	// Deleting the document would leave the server's in-memory config behind, so write an unset key.
	test.afterEach(async () => {
		if (await storedNodelessConfig()) {
			await storeNodelessConfig('', 0);
		}
	});

	async function openWithWarning(page: Page, derivationIndex: number, warning: string) {
		await storeNodelessConfig(ZPUB, derivationIndex);
		await expect(async () => {
			await page.goto('/admin/bitcoin-nodeless');
			await expect(page.getByText(warning)).toBeVisible({ timeout: 1000 });
		}).toPass({ timeout: 15_000 });
	}

	async function deleteConfiguration(page: Page, deleteLabel: string) {
		page.on('dialog', (dialog) => dialog.accept());
		await page.getByRole('button', { name: deleteLabel }).click();
		await expect.poll(storedNodelessConfig).toBeNull();
	}

	test('at the last index, the page warns, previews that address, and deletes the key', async ({
		page
	}) => {
		await openWithWarning(
			page,
			LAST_INDEX,
			'This key is almost out of receiving addresses. Delete this configuration and set up a new key to keep receiving bitcoin payments.'
		);
		await expect(page.getByText('bc1qvpzdfcnqgp5qqvhsllttmgs57pcwhxgd55namz')).toBeVisible();

		await deleteConfiguration(page, 'Delete configuration');
		await expect(page.getByRole('button', { name: 'Set up' })).toBeVisible();
	});

	test('past the last index, the page says payments fail and deletes the key', async ({ page }) => {
		await openWithWarning(
			page,
			LAST_INDEX + 1,
			'This key has no receiving address left, so bitcoin payments fail. Delete this configuration and set up a new key.'
		);
		await expect(page.getByRole('heading', { name: 'Next addresses' })).toHaveCount(0);

		await deleteConfiguration(page, 'Delete configuration');
		await expect(page.getByRole('button', { name: 'Set up' })).toBeVisible();
	});

	test.describe('in French', () => {
		test.use({ locale: 'fr-FR' });

		test('shows both warnings in French and deletes the key', async ({ page }) => {
			await openWithWarning(
				page,
				LAST_INDEX,
				"Cette clé n'a presque plus d'adresses de réception. Supprimez cette configuration et configurez une nouvelle clé pour continuer à recevoir des paiements en bitcoin."
			);
			await openWithWarning(
				page,
				LAST_INDEX + 1,
				"Cette clé n'a plus aucune adresse de réception : les paiements en bitcoin échouent. Supprimez cette configuration et configurez une nouvelle clé."
			);

			await deleteConfiguration(page, 'Supprimer la configuration');
			await expect(page.getByRole('button', { name: 'Configurer' })).toBeVisible();
		});
	});
});
