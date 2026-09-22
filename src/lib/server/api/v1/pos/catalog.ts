import { collections } from '$lib/server/database';
import type { LanguageKey } from '$lib/translations';
import type { Product } from '$lib/types/Product';
import type { Tag } from '$lib/types/Tag';
import type { PosCatalogProduct, PosCatalogResponse, PosCatalogTag } from '$lib/types/ApiV1Pos';
import { catalogVisibilityFilter } from '../catalog/listProducts';
import { loadCatalogPictures, type CatalogPictureDto } from '../catalog/pictures';
import type { PictureOptions } from '../catalog/pictureOptions';
import { loadCatalogVatRates } from '../catalog/vat';

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

/** No price: the till sends `PosSaleItem.price` at sale time, so it holds its own. */
export function toPosCatalogProduct(
	product: Product,
	language: LanguageKey,
	picture?: CatalogPictureDto,
	vatRate = 0
): PosCatalogProduct {
	return {
		// A be-BOP product `_id` is its slug, and what `PosSaleItem.product` refers back to.
		slug: product._id,
		name: translated(product, language, 'name'),
		shortDescription: translated(product, language, 'shortDescription'),
		...(picture && { picture }),
		tagIds: product.tagIds ?? [],
		vatRate
	};
}

/**
 * The tags the returned products reference, resolved.
 *
 * Scoped to what is used rather than every tag in the shop, so the ETag does not move on edits the
 * caller cannot observe.
 */
async function listReferencedTags(products: PosCatalogProduct[]): Promise<PosCatalogTag[]> {
	const ids = [...new Set(products.flatMap((product) => product.tagIds))];
	if (!ids.length) {
		return [];
	}
	const docs = await collections.tags
		.find({ _id: { $in: ids } })
		.sort({ _id: 1 })
		.project<Pick<Tag, '_id' | 'name' | 'family'>>({ _id: 1, name: 1, family: 1 })
		.toArray();
	return docs.map((doc) => ({
		id: doc._id,
		name: doc.name ?? doc._id,
		...(doc.family && { family: doc.family })
	}));
}

/**
 * The whole catalog, in one document — the seam polls it with `If-None-Match` and expects a full
 * snapshot.
 *
 * Both sorts are load-bearing: an ETag over the serialized body is only stable if the order is, and
 * Mongo guarantees no natural order.
 */
export async function listPosCatalog(
	language: LanguageKey,
	picture?: PictureOptions
): Promise<PosCatalogResponse> {
	const docs = await collections.products
		.find(catalogVisibilityFilter())
		.sort({ _id: 1 })
		.toArray();
	const pictures = await loadCatalogPictures(
		docs.map((doc) => doc._id),
		picture
	);
	const vatRates = await loadCatalogVatRates(docs as Product[]);
	const products = docs.map((doc) =>
		toPosCatalogProduct(doc as Product, language, pictures.get(doc._id), vatRates.get(doc._id))
	);
	return { products, tags: await listReferencedTags(products) };
}
