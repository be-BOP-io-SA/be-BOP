import type { JWT } from '@auth/core/jwt';
import type { Account } from '@auth/core/types';

/**
 * Auth.js gives the user a random id at each sign-in and keeps the id built by the provider's
 * `profile` callback (`github-…`, `google-…`) on the account: the token must carry the latter,
 * since be-BOP recognizes the customer and reads the provider from it.
 */
export function withProviderAccountId(token: JWT, account: Account | null | undefined): JWT {
	if (account) {
		token.sub = account.providerAccountId;
	}
	return token;
}
