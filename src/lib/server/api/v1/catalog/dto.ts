import type { LanguageKey } from '$lib/translations';
import type { Product } from '$lib/types/Product';
import { amountToMinor } from '../orders/money';

export type CatalogProductDto = {
	id: string;
	alias: string[];
	type: Product['type'];
	name: string;
	shortDescription: string;
	price: { amountMinor: number; currency: string };
	payWhatYouWant: boolean;
	shipping: boolean;
	tagIds: string[];
	hasVariations: boolean;
	variationLabels?: Product['variationLabels'];
	variations?: Array<{
		name: string;
		value: string;
		price?: { amountMinor: number; currency: string };
	}>;
	stock?: { available: number };
};

function translated(
	product: Product,
	language: LanguageKey,
	field: 'name' | 'shortDescription'
): string {
	const bag = product.translations?.[language] as
		| Partial<Pick<Product, 'name' | 'shortDescription'>>
		| undefined;
	return (bag?.[field] || product[field] || '') as string;
}

export function toCatalogProductDto(product: Product, language: LanguageKey): CatalogProductDto {
	const currency = product.price.currency;
	return {
		id: product._id,
		alias: product.alias ?? [],
		type: product.type,
		name: translated(product, language, 'name'),
		shortDescription: translated(product, language, 'shortDescription'),
		price: {
			amountMinor: amountToMinor(product.price.amount, currency),
			currency
		},
		payWhatYouWant: !!product.payWhatYouWant,
		shipping: !!product.shipping,
		tagIds: product.tagIds ?? [],
		hasVariations: !!product.hasVariations,
		...(product.variationLabels && { variationLabels: product.variationLabels }),
		...(product.variations?.length
			? {
					variations: product.variations.map((v) => ({
						name: v.name,
						value: v.value,
						...(typeof v.price === 'number'
							? {
									price: {
										amountMinor: amountToMinor(v.price, currency),
										currency
									}
							  }
							: {})
					}))
			  }
			: {}),
		...(product.stock && { stock: { available: product.stock.available } })
	};
}
