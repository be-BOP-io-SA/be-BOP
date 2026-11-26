import type { JWT } from '@auth/core/jwt';
import type { Account } from '@auth/core/types';

/** be-BOP knows a customer by the provider's id (`github-…`), which Auth.js keeps on the account. */
export function withProviderAccountId(token: JWT, account: Account | null | undefined): JWT {
	if (account) {
		token.sub = account.providerAccountId;
	}
	return token;
}
