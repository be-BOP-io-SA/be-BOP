import { runtimeConfig } from '$lib/server/runtime-config';
import { collections } from '$lib/server/database';
import { CustomerTouchInterface } from '$lib/types/CustomerTouchInterface';

export async function load() {
	const pictures = await collections.pictures
		.find({ ctiCategorySlug: { $exists: true } }) // Checks if the field exists
		.sort({ createdAt: 1 })
		.toArray();

	return {
		cti: runtimeConfig.customerTouchInterface as CustomerTouchInterface,
		pictures
	};
}
