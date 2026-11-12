import { expect, test } from '@playwright/test';
import { MongoClient } from 'mongodb';

// Same database as the web server started by playwright.config.ts.
const E2E_DB = 'bebop-e2e';
const CONFIG_KEYS = ['footerLinks', 'socialNetworkIcons'];

const LINKS = [
	{ id: 'e2e-link-mail', label: 'E2E mail', href: 'mailto:shop@example.com', target: '_blank' },
	{ id: 'e2e-link-phone', label: 'E2E phone', href: 'tel:+33100000000', target: '_blank' },
	{ id: 'e2e-link-web', label: 'E2E web', href: 'https://example.com', target: '_blank' },
	{ id: 'e2e-link-page', label: 'E2E page', href: '/e2e-page', target: '_self' }
];
const ICON = {
	name: 'E2E icon',
	svg: '<svg xmlns="http://www.w3.org/2000/svg"/>',
	href: 'tel:+33100000000'
};

async function withDb<T>(run: (db: ReturnType<MongoClient['db']>) => Promise<T>): Promise<T> {
	const client = await MongoClient.connect(process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017');
	try {
		return await run(client.db(E2E_DB));
	} finally {
		await client.close();
	}
}

let savedConfig: Array<{ _id: string; data: unknown }> = [];

test.beforeAll(async () => {
	await withDb(async (db) => {
		const config = db.collection<{ _id: string; data: unknown }>('runtimeConfig');
		savedConfig = await config.find({ _id: { $in: CONFIG_KEYS } }).toArray();
		const footerLinks = (savedConfig.find((item) => item._id === 'footerLinks')?.data ??
			[]) as unknown[];
		for (const [_id, data] of [
			[
				'footerLinks',
				[...footerLinks, ...LINKS.map(({ id, label, href }) => ({ id, label, href }))]
			],
			['socialNetworkIcons', [ICON]]
		] as const) {
			await config.updateOne({ _id }, { $set: { data, updatedAt: new Date() } }, { upsert: true });
		}
	});
});

test.afterAll(async () => {
	await withDb(async (db) => {
		const config = db.collection<{ _id: string; data: unknown }>('runtimeConfig');
		for (const key of CONFIG_KEYS) {
			const saved = savedConfig.find((item) => item._id === key);
			if (saved) {
				await config.replaceOne({ _id: key }, saved);
			} else {
				await config.deleteOne({ _id: key });
			}
		}
	});
});

test('links that leave the shop open in a new tab, links to its pages in the same tab', async ({
	page
}) => {
	// The server reads the settings back through a change stream, so they apply on a later page.
	await expect(async () => {
		await page.goto('/');
		await expect(page.getByRole('link', { name: LINKS[0].label })).toBeVisible({ timeout: 1000 });
	}).toPass();

	for (const link of LINKS) {
		await expect(page.getByRole('link', { name: link.label })).toHaveAttribute(
			'target',
			link.target
		);
	}
	await expect(page.getByRole('link', { name: ICON.name })).toHaveAttribute('target', '_blank');
});
