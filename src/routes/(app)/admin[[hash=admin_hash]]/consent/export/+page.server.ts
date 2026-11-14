import { collections } from '$lib/server/database';
import { consentOptinLabel } from '$lib/server/consentOptins';

export const load = async ({ url, locals }) => {
	// Enabled opt-ins first, then disabled ones, then deleted ones, each group in the employees' order.
	const group = (optin: { enabled: boolean; deletedAt?: Date }) =>
		optin.deletedAt ? 2 : optin.enabled ? 0 : 1;
	const optins = (await collections.consentOptins.find({}).sort({ sortOrder: 1 }).toArray()).sort(
		(a, b) => group(a) - group(b)
	);

	const selectedId = url.searchParams.get('optin') ?? optins[0]?._id ?? null;

	const customers = selectedId
		? await collections.personalInfo
				.find<{ email?: string; npub?: string; updatedAt?: Date; createdAt?: Date }>(
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
			deleted: !!optin.deletedAt,
			disabled: !optin.enabled
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
