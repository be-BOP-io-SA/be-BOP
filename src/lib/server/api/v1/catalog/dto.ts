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
	/** The values the product offers in each variation family, by family name. */
	variations?: Record<string, string[]>;
	/**
	 * What a value adds to the product price, by family then value — only for the values where it
	 * is not zero.
	 */
	variationPrices?: Record<string, Record<string, { amountMinor: number; currency: string }>>;
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

/** The values offered in each family, in the order the product lists them. */
export function valuesByFamily(
	variations: NonNullable<Product['variations']>
): Record<string, string[]> {
	const families: Record<string, string[]> = {};
	for (const { name, value } of variations) {
		(families[name] ??= []).push(value);
	}
	return families;
}

/** The non-zero supplements, by family then value. Undefined when every value adds nothing. */
function supplementsByFamily(
	variations: NonNullable<Product['variations']>,
	currency: Product['price']['currency']
): CatalogProductDto['variationPrices'] {
	const families: NonNullable<CatalogProductDto['variationPrices']> = {};
	for (const { name, value, price } of variations) {
		if (!price) {
			continue;
		}
		(families[name] ??= {})[value] = { amountMinor: amountToMinor(price, currency), currency };
	}
	return Object.keys(families).length ? families : undefined;
}

export function toCatalogProductDto(
	product: Product,
	language: LanguageKey,
	picture?: CatalogPictureDto,
	vatRate = 0
): CatalogProductDto {
	const currency = product.price.currency;
	const variationPrices = product.variations?.length
		? supplementsByFamily(product.variations, currency)
		: undefined;
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
		...(product.variations?.length && {
			variations: valuesByFamily(product.variations)
		}),
		...(variationPrices && { variationPrices }),
		...(product.stock && { stock: { available: product.stock.available } })
	};
}
