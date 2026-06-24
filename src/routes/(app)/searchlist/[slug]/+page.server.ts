import { error } from '@sveltejs/kit';
import { collections } from '$lib/server/database';
import { readUrlState, searchProducts, type VatContext } from '$lib/server/searchlist';
import type { Picture } from '$lib/types/Picture';
import type { Tag } from '$lib/types/Tag';
import type { VatProfile } from '$lib/types/VatProfile';
import { runtimeConfig } from '$lib/server/runtime-config';
import { rateLimit } from '$lib/server/rateLimit';
import { CUSTOMER_ROLE_ID } from '$lib/types/User';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url, locals }) => {
	// hooks.server.ts only rate-limits mutating methods (POST/PUT/PATCH/DELETE);
	// the searchlist GET is otherwise unprotected against scraping / regex-scan abuse.
	rateLimit(locals.clientIp, 'searchlist', 120, { minutes: 1 });

	const searchlist = await collections.searchlists.findOne({ _id: params.slug });
	if (!searchlist) {
		throw error(404, 'Searchlist not found');
	}

	const isEmployee = locals.user?.roleId !== undefined && locals.user.roleId !== CUSTOMER_ROLE_ID;
	if (searchlist.disabled && !isEmployee) {
		throw error(404, 'Searchlist not found');
	}

	const state = readUrlState(url, searchlist);

	const vatProfiles = await collections.vatProfiles
		.find({})
		.project<Pick<VatProfile, '_id' | 'rates'>>({ _id: 1, rates: 1 })
		.map((p) => ({ _id: p._id.toString(), rates: p.rates }))
		.toArray();
	const vatContext: VatContext = {
		vatProfiles,
		bebopCountry: runtimeConfig.vatCountry,
		userCountry: locals.countryCode,
		vatSingleCountry: runtimeConfig.vatSingleCountry,
		displayVatIncluded: runtimeConfig.displayVatIncludedInProduct
	};

	const { products, total, totalPages } = await searchProducts(
		searchlist,
		state,
		locals,
		vatContext
	);

	const productIds = products.map((p) => p._id);
	const pictures = productIds.length
		? await collections.pictures
				.find({ productId: { $in: productIds } })
				.sort({ order: 1, createdAt: 1 })
				.toArray()
		: [];

	const picturesByProductId: Record<string, Picture[]> = {};
	for (const pic of pictures) {
		const pid = pic.productId;
		if (!pid) {
			continue;
		}
		(picturesByProductId[pid] ||= []).push(pic);
	}

	const digitalFiles = productIds.length
		? await collections.digitalFiles
				.find({ productId: { $in: productIds } })
				.project<{ productId: string }>({ productId: 1, _id: 0 })
				.toArray()
		: [];
	const digitalFilesByProductId: Record<string, boolean> = {};
	for (const df of digitalFiles) {
		if (df.productId) {
			digitalFilesByProductId[df.productId] = true;
		}
	}

	const allowedTagIds = searchlist.filters.tags?.allowedTagIds ?? [];
	const allowedTags =
		searchlist.filters.tags?.enabled && allowedTagIds.length > 0
			? await collections.tags
					.find({ _id: { $in: allowedTagIds } })
					.project<Pick<Tag, '_id' | 'name'>>({
						_id: 1,
						name: { $ifNull: [`$translations.${locals.language}.name`, '$name'] }
					})
					.toArray()
			: [];

	return {
		searchlist,
		state,
		products,
		picturesByProductId,
		digitalFilesByProductId,
		total,
		totalPages,
		allowedTags,
		basePath: `/searchlist/${params.slug}`,
		displayVatIncluded: runtimeConfig.displayVatIncludedInProduct
	};
};
