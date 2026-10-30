import { describe, expect, it } from 'vitest';
import { apiError } from './errors';

describe('apiError', () => {
	it('returns JSON error envelope with status', async () => {
		const res = apiError(401, 'UNAUTHORIZED', 'Missing API key');
		expect(res.status).toBe(401);
		await expect(res.json()).resolves.toEqual({
			error: { code: 'UNAUTHORIZED', message: 'Missing API key' }
		});
	});

	it('includes optional details', async () => {
		const res = apiError(400, 'VALIDATION_ERROR', 'Invalid body', { field: 'orders' });
		await expect(res.json()).resolves.toEqual({
			error: {
				code: 'VALIDATION_ERROR',
				message: 'Invalid body',
				details: { field: 'orders' }
			}
		});
	});
});
