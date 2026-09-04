import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';

const project = vi.fn();
const find = vi.fn();

vi.mock('$lib/server/database', () => ({
	collections: {
		apiKeys: {
			find: (...args: unknown[]) => find(...args)
		}
	}
}));
vi.mock('$app/environment', () => ({
	building: false,
	dev: true
}));

import { listApiKeys } from './keys';

describe('listApiKeys', () => {
	beforeEach(() => {
		find.mockReset();
		project.mockReset();
		project.mockReturnValue({
			sort: () => ({
				toArray: async () => [
					{
						_id: new ObjectId(),
						name: 'desk',
						keyPrefix: 'bebop_ak_live_abcd1234',
						scopes: ['orders:write'],
						createdAt: new Date(),
						updatedAt: new Date()
					}
				]
			})
		});
		find.mockReturnValue({ project });
	});

	it('projects without keyHash so list JSON cannot leak digests', async () => {
		const rows = await listApiKeys();
		expect(find).toHaveBeenCalledWith({});
		expect(project).toHaveBeenCalledTimes(1);
		const projection = project.mock.calls[0][0] as Record<string, number>;
		expect(projection.keyHash).toBeUndefined();
		expect(Object.keys(projection).sort()).toEqual(
			[
				'_id',
				'createdAt',
				'createdBy',
				'expiresAt',
				'keyPrefix',
				'lastUsedAt',
				'name',
				'revokedAt',
				'scopes',
				'updatedAt'
			].sort()
		);
		expect(rows).toHaveLength(1);
		expect(rows[0]).not.toHaveProperty('keyHash');
	});
});
