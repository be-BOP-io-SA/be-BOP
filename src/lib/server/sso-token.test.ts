import { describe, expect, it } from 'vitest';
import type { Account } from '@auth/core/types';
import { withProviderAccountId } from './sso-token';

const account: Account = {
	provider: 'github',
	type: 'oauth',
	providerAccountId: 'github-12345'
};

describe('withProviderAccountId', () => {
	it("puts the provider's account id in the token at sign-in", () => {
		const token = withProviderAccountId({ sub: '3f9a2c1e-0b7d-4e2a-9c61-5d8e7f1a2b3c' }, account);

		expect(token.sub).toBe('github-12345');
		expect(token.sub?.split('-')[0]).toBe('github');
	});

	it('keeps the token as is when the session is only read', () => {
		expect(withProviderAccountId({ sub: 'github-12345' }, undefined).sub).toBe('github-12345');
		expect(withProviderAccountId({ sub: 'github-12345' }, null).sub).toBe('github-12345');
	});
});
