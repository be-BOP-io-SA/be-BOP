import type { LanguageKey } from '$lib/translations';
import type { Product } from '$lib/types/Product';
import { amountToMinor } from '../orders/money';
import type { CatalogPictureDto } from './pictures';

export type CatalogProductDto = {
	id: string;
	alias: string[];
	type: Product['type'];
	name: string;
	shortDescription: string;
	price: { amountMinor: number; currency: string };
	/**
	 * VAT rate as a percentage, resolved against the shop's country. `price` excludes it: the
	 * amount a customer pays is `price * (1 + vatRate / 100)`.
	 */
	vatRate: number;
	payWhatYouWant: boolean;
	shipping: boolean;
	tagIds: string[];
	hasVariations: boolean;
	/**
	 * Lowest-resolution picture be-BOP generated, as a link into be-BOP's own picture proxy.
	 * Absent when the product has none.
	 */
	picture?: CatalogPictureDto;
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

export function toCatalogProductDto(
	product: Product,
	language: LanguageKey,
	picture?: CatalogPictureDto,
	vatRate = 0
): CatalogProductDto {
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
		vatRate,
		payWhatYouWant: !!product.payWhatYouWant,
		shipping: !!product.shipping,
		tagIds: product.tagIds ?? [],
		hasVariations: !!product.hasVariations,
		...(picture && { picture }),
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
