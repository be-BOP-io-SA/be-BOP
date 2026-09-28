import { describe, expect, it } from 'vitest';
import type { Role } from '$lib/types/Role';
import { oauthProvidersForRole } from './oauth-providers';

function role(permissions: Partial<Role['permissions']>): Role {
	return {
		_id: 'test',
		name: 'test',
		createdAt: new Date(),
		updatedAt: new Date(),
		permissions: { read: [], write: [], forbidden: [], ...permissions }
	};
}

const providers = [
	{ slug: 'google', clientSecret: 'google-secret' },
	{ slug: 'discord', clientSecret: 'discord-secret' }
];

describe('oauthProvidersForRole', () => {
	it('keeps the secrets for a role that can write the OAuth settings', () => {
		expect(oauthProvidersForRole(providers, role({ write: ['/admin/oauth/*'] }))).toEqual(
			providers
		);
		expect(oauthProvidersForRole(providers, role({ write: ['/admin/*'] }))).toEqual(providers);
	});

	it('blanks the secrets for a read-only role but keeps the rest', () => {
		expect(oauthProvidersForRole(providers, role({ read: ['/admin/oauth/*'] }))).toEqual([
			{ slug: 'google', clientSecret: '' },
			{ slug: 'discord', clientSecret: '' }
		]);
	});

	it('blanks the secrets when the role is forbidden the OAuth settings', () => {
		const forbidden = role({ write: ['/admin/*'], forbidden: ['/admin/oauth/*'] });

		expect(JSON.stringify(oauthProvidersForRole(providers, forbidden))).not.toContain('-secret');
	});

	it('blanks the secrets when there is no role', () => {
		expect(JSON.stringify(oauthProvidersForRole(providers, undefined))).not.toContain('-secret');
	});

	it('does not touch the stored providers', () => {
		oauthProvidersForRole(providers, undefined);

		expect(providers[0].clientSecret).toBe('google-secret');
	});
});
