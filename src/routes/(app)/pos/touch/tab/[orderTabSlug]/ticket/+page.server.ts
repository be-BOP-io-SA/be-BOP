import { collections } from '$lib/server/database';
import { getOrCreateOrderTab } from '$lib/server/orderTab';
import { runtimeConfig } from '$lib/server/runtime-config';
import { vatRate } from '$lib/types/Country';
import { UNDERLYING_CURRENCY, type Currency } from '$lib/types/Currency';
import { ObjectId } from 'mongodb';

export async function load({ locals, params }) {
	const tab = await getOrCreateOrderTab({ slug: params.orderTabSlug });

	const products = await collections.products
		.find({ _id: { $in: tab.items.map((it) => it.productId) } })
		.project<{
			_id: string;
			name: string;
			price: { amount: number; currency: string };
			vatProfileId?: string;
		}>({
			_id: 1,
			name: { $ifNull: [`$translations.${locals.language}.name`, '$name'] },
			price: 1,
			vatProfileId: { $toString: '$vatProfileId' }
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

	const itemsForTicket = tab.items
		.map((item) => {
			const product = productById.get(item.productId.toString());
			if (!product) {
				return null;
			}
			const quantity = item.originalQuantity ?? item.quantity;
			const unitPrice = product.price.amount;
			const vatRate = getVatRate(product.vatProfileId);
			return {
				name: product.name,
				quantity,
				unitPrice,
				totalExcl: unitPrice * quantity,
				vatRate
			};
		})
		.filter((item): item is NonNullable<typeof item> => item !== null);

	const totalExclVat = itemsForTicket.reduce((sum, item) => sum + item.totalExcl, 0);

	const vatByRate = new Map<number, number>();
	itemsForTicket.forEach((item) => {
		const vatAmount = item.totalExcl * (item.vatRate / 100);
		vatByRate.set(item.vatRate, (vatByRate.get(item.vatRate) ?? 0) + vatAmount);
	});

	const totalVat = Array.from(vatByRate.values()).reduce((sum, v) => sum + v, 0);
	const totalInclVat = totalExclVat + totalVat;

	const discount = tab.discount;
	const hasDiscount = discount && discount.percentage > 0;
	const discountMultiplier = hasDiscount ? 1 - discount.percentage / 100 : 1;
	const totalAfterDiscount = totalInclVat * discountMultiplier;

	const currency = ((tab.items[0] &&
		productById.get(tab.items[0].productId.toString())?.price.currency) ??
		UNDERLYING_CURRENCY) as Currency;

	const poolLabel = params.orderTabSlug
		.split('-')
		.map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');

	const sellerIdentity = runtimeConfig.sellerIdentity;
	const companyLogoId = runtimeConfig.ticketLogoId || runtimeConfig.logo?.pictureId;

	return {
		layoutReset: true,
		poolLabel,
		generatedAt: new Date(),
		tagGroups: [
			{
				tagNames: [],
				items: itemsForTicket.map((item) => ({
					product: { name: item.name },
					quantity: item.quantity,
					variations: [],
					notes: []
				}))
			}
		],
		priceInfo: {
			itemPrices: itemsForTicket.map((item) => ({
				amount: item.totalExcl,
				currency
			})),
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
