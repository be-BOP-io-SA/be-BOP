import { collections } from '$lib/server/database';
import { getOrCreateOrderTab } from '$lib/server/orderTab';
import { runtimeConfig } from '$lib/server/runtime-config';
import { vatRate } from '$lib/types/Country';
import type { Currency } from '$lib/types/Currency';
import { resolvePoolLabel } from '$lib/types/PosTabGroup';
import { toCurrency } from '$lib/utils/toCurrency';
import { ObjectId } from 'mongodb';

export async function load({ locals, params }) {
	const tab = await getOrCreateOrderTab({ slug: params.orderTabSlug });

	const products = await collections.products
		.find({ _id: { $in: tab.items.map((it) => it.productId) } })
		.project<{
			_id: string;
			name: string;
			price: { amount: number; currency: Currency };
			vatProfileId?: string;
			tagIds?: string[];
		}>({
			_id: 1,
			name: { $ifNull: [`$translations.${locals.language}.name`, '$name'] },
			price: 1,
			vatProfileId: { $toString: '$vatProfileId' },
			tagIds: 1
		})
		.toArray();

	const productById = new Map(products.map((p) => [p._id.toString(), p]));

	const vatProfileIds = [
		...new Set(products.map((p) => p.vatProfileId).filter(Boolean))
	] as string[];
	const vatProfiles = vatProfileIds.length
		? await collections.vatProfiles
				.find({ _id: { $in: vatProfileIds.map((id) => new ObjectId(id)) } })
				.toArray()
		: [];
	const vatProfileById = new Map(vatProfiles.map((v) => [v._id.toString(), v]));

	const bebopCountry = runtimeConfig.vatCountry;
	function getVatRate(vatProfileId?: string): number {
		if (!bebopCountry) {
			return 0;
		}
		if (!vatProfileId) {
			return vatRate(bebopCountry);
		}
		const profile = vatProfileById.get(vatProfileId);
		return profile?.rates?.[bebopCountry] ?? vatRate(bebopCountry);
	}

	const discountTagId = tab.discount?.tagId;
	const discountTagDoc = discountTagId
		? await collections.tags.findOne({ _id: discountTagId }, { projection: { name: 1 } })
		: null;
	if (discountTagId && !discountTagDoc) {
		console.warn(`Discount tag ${discountTagId} not found (may have been deleted)`);
	}
	const discountTagLabel = discountTagDoc?.name || discountTagId || '';

	const mainCurrency = runtimeConfig.mainCurrency;
	const itemsForTicket = tab.items
		.map((item) => {
			const product = productById.get(item.productId.toString());
			if (!product) {
				return null;
			}
			const quantity = item.originalQuantity ?? item.quantity;
			const totalExcl = toCurrency(
				mainCurrency,
				product.price.amount * quantity,
				product.price.currency
			);
			const vatRate = getVatRate(product.vatProfileId);
			const totalIncl = totalExcl * (1 + vatRate / 100);
			return {
				name: product.name,
				quantity,
				totalExcl,
				totalIncl,
				vatRate,
				matchesDiscountTag: discountTagId ? (product.tagIds ?? []).includes(discountTagId) : true
			};
		})
		.filter((item): item is NonNullable<typeof item> => item !== null);

	const totalExclVat = itemsForTicket.reduce((sum, item) => sum + item.totalExcl, 0);
	const totalInclVat = itemsForTicket.reduce((sum, item) => sum + item.totalIncl, 0);

	const vatByRate = new Map<number, number>();
	itemsForTicket.forEach((item) => {
		const vatAmount = item.totalIncl - item.totalExcl;
		vatByRate.set(item.vatRate, (vatByRate.get(item.vatRate) ?? 0) + vatAmount);
	});

	const discount = tab.discount;
	const hasDiscount = discount && discount.percentage > 0;

	let totalAfterDiscount = totalInclVat;
	if (hasDiscount) {
		const discountableIncl = itemsForTicket
			.filter((item) => item.matchesDiscountTag)
			.reduce((sum, item) => sum + item.totalIncl, 0);
		totalAfterDiscount = Math.max(0, totalInclVat - discountableIncl * (discount.percentage / 100));
	}

	const itemGroups =
		hasDiscount && discountTagId
			? [
					{
						tagNames: [discountTagLabel],
						items: itemsForTicket.filter((i) => i.matchesDiscountTag)
					},
					{ tagNames: [] as string[], items: itemsForTicket.filter((i) => !i.matchesDiscountTag) }
			  ].filter((g) => g.items.length > 0)
			: [{ tagNames: [] as string[], items: itemsForTicket }];

	const currency = mainCurrency;

	const poolLabel = resolvePoolLabel(runtimeConfig.posTabGroups, params.orderTabSlug);

	const sellerIdentity = runtimeConfig.sellerIdentity;
	const companyLogoId = runtimeConfig.ticketLogoId || runtimeConfig.logo?.pictureId;

	return {
		layoutReset: true,
		poolLabel,
		generatedAt: new Date(),
		poolOpenedAt: tab.poolOpenedAt,
		tagGroups: itemGroups.map((group) => ({
			tagNames: group.tagNames,
			items: group.items.map((item) => ({
				product: { name: item.name },
				quantity: item.quantity,
				variations: [],
				notes: []
			}))
		})),
		priceInfo: {
			itemPrices: itemGroups.flatMap((group) =>
				group.items.map((item) => ({
					amount: item.totalExcl,
					currency
				}))
			),
			total: totalAfterDiscount,
			totalExclVat,
			vatBreakdown: Array.from(vatByRate.entries())
				.map(([rate, amount]) => ({ rate, amount }))
				.sort((a, b) => a.rate - b.rate),
			currency,
			...(hasDiscount
				? {
						totalBeforeDiscount: totalInclVat,
						discountPercentage: discount.percentage
				  }
				: {})
		},
		companyInfo: {
			businessName: sellerIdentity?.businessName,
			address: sellerIdentity?.address,
			vatNumber: sellerIdentity?.vatNumber,
			phone: sellerIdentity?.contact?.phone
		},
		companyLogoUrl: companyLogoId ? `/picture/raw/${companyLogoId}/format/128` : undefined,
		showBebopLogo: !runtimeConfig.removeBebopLogoPOS
	};
}
