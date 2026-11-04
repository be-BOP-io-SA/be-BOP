import { expect, test } from '@playwright/test';
import { MongoClient } from 'mongodb';

test.use({ storageState: { cookies: [], origins: [] } });

async function errorCount() {
	const client = await MongoClient.connect(process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017');
	try {
		return await client.db('bebop-e2e').collection('errors').countDocuments();
	} finally {
		await client.close();
	}
}

test('a form field with a huge array index is a client error and is not stored', async ({
	page
}) => {
	const before = await errorCount();

	const response = await page.request.post('/identity', {
		form: { 'x[99999]': '1' },
		headers: { origin: 'http://localhost:5012' }
	});

	expect(response.status()).toBe(400);
	expect(await errorCount()).toBe(before);
});
