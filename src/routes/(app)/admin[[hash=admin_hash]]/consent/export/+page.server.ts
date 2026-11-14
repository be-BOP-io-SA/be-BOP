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

	// One consent record per contact address, so each customer is listed once.
	const customers = selectedId
		? await collections.consentRecords
				.find({ optinIds: selectedId })
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
		customers: customers.map((customer) => ({
			email: customer.email ?? '',
			npub: customer.npub ?? '',
			updatedAt: customer.updatedAt.toISOString()
		}))
	};
};
