import { collections } from '$lib/server/database';
import { consentOptinLabel } from '$lib/server/consentOptins';

export const load = async ({ url, locals }) => {
	const optins = await collections.consentOptins
		.find({})
		.sort({ deletedAt: 1, sortOrder: 1 })
		.toArray();

	const selectedId = url.searchParams.get('optin') ?? optins[0]?._id ?? null;

	const customers = selectedId
		? await collections.personalInfo
				.find(
					{ consentOptinIds: selectedId },
					{ projection: { email: 1, npub: 1, updatedAt: 1, createdAt: 1 } }
				)
				.sort({ updatedAt: -1 })
				.toArray()
		: [];

	return {
		optins: optins.map((optin) => ({
			id: optin._id,
			label: consentOptinLabel(optin, locals.language),
			deleted: !!optin.deletedAt
		})),
		selectedId,
		customers: customers
			.filter((customer) => customer.email || customer.npub)
			.map((customer) => ({
				email: customer.email ?? '',
				npub: customer.npub ?? '',
				updatedAt: (customer.updatedAt ?? customer.createdAt)?.toISOString() ?? ''
			}))
	};
};
