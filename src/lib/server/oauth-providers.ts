import { isAllowedOnPage, type Role } from '$lib/types/Role';

// A read-only role can open /admin/oauth but must not walk away with the providers' client secrets.
export function oauthProvidersForRole<T extends { clientSecret: string }>(
	providers: T[],
	role: Role | undefined
): T[] {
	const canEdit = !!role && isAllowedOnPage(role, '/admin/oauth', 'write');

	return canEdit ? providers : providers.map((provider) => ({ ...provider, clientSecret: '' }));
}
