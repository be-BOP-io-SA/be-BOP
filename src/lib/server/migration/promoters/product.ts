import { collections } from '../../database';
import { runtimeConfig } from '../../runtime-config';
import { CURRENCIES, type Currency } from '$lib/types/Currency';
import type { Product } from '$lib/types/Product';
import type { MigrationPromoter } from '../promoter';
import { importImageFromUrl } from './image';

interface NormalizedProduct {
	name?: string;
	slug?: string;
	sku?: string;
	price?: string;
	regularPrice?: string;
	salePrice?: string;
	currency?: string;
	description?: string;
	shortDescription?: string;
	status?: string;
	stockStatus?: string;
	stockQuantity?: number;
	categoryIds?: number[];
	imageMediaIds?: number[];
}

interface WcRawImage {
	id?: number;
	src?: string;
	name?: string;
	alt?: string;
	position?: number;
}

async function pickAvailableProductId(slug: string): Promise<string> {
	const base = slug.trim() || 'imported-product';
	if (!(await collections.products.findOne({ _id: base }))) return base;
	for (let i = 2; i < 1000; i++) {
		const candidate = `${base}-${i}`;
		if (!(await collections.products.findOne({ _id: candidate }))) return candidate;
	}
	throw new Error(`Could not find an available product id starting from "${base}"`);
}

function parsePriceAmount(raw?: string): number {
	if (!raw) return 0;
	const n = parseFloat(raw);
	return Number.isFinite(n) && n >= 0 ? n : 0;
}

export const productPromoter: MigrationPromoter = {
	type: 'product',
	actionLabel: 'Create product',

	async promote(staged) {
		const n = (staged.normalized ?? {}) as NormalizedProduct;

		// Refuse non-published products. WC's `status` covers drafts, pending,
		// private, etc. — those typically have empty/incomplete data and
		// shouldn't land in be-BOP as broken products. Admin should publish
		// them in WP first if they want them migrated.
		const sourceStatus = (staged.raw?.status ?? '') as string;
		if (sourceStatus && sourceStatus !== 'publish') {
			throw new Error(
				`Refusing to import a "${sourceStatus}" product. Only published WC products ` +
					'can be migrated. Publish it in WordPress first or skip it.'
			);
		}

		const _id = await pickAvailableProductId(n.slug ?? '');
		const now = new Date();

		// Pick currency: prefer WC's global currency captured at fetch time
		// (e.g. "EUR" for a French shop). Fall back to be-BOP main currency
		// only if WC's currency is unknown to be-BOP. Without this, a 500€
		// WC product would import as 500 in the be-BOP shop's currency,
		// silently mispricing it 1500× in some cases (e.g. EUR → XPF).
		const wcCurrency = (n.currency ?? '').toUpperCase();
		const priceCurrency: Currency =
			wcCurrency && (CURRENCIES as readonly string[]).includes(wcCurrency)
				? (wcCurrency as Currency)
				: ((runtimeConfig.mainCurrency ?? 'EUR') as Currency);
		// WC's sale_price overrides regular_price when set; otherwise price ≈ regular_price.
		const priceAmount = parsePriceAmount(n.price ?? n.regularPrice);

		// WC description is HTML (often Gutenberg blocks). Wrap it like cmsPage
		// promoter does so the scoped WP block CSS targets it on render.
		const wrappedDescription = n.description
			? `<div class="wp-imported">\n${n.description}\n</div>`
			: '';

		const product: Product = {
			_id,
			alias: [_id],
			name: n.name || _id,
			description: wrappedDescription,
			shortDescription: n.shortDescription ?? '',
			type: 'resource',
			price: { amount: priceAmount, currency: priceCurrency },
			shipping: false,
			displayShortDescription: false,
			preorder: false,
			payWhatYouWant: false,
			standalone: false,
			free: priceAmount === 0,
			isTicket: false,
			hideDiscountExpiration: false,
			actionSettings: {
				eShop: { visible: true, canBeAddedToBasket: true },
				retail: { visible: true, canBeAddedToBasket: true },
				googleShopping: { visible: false },
				nostr: { visible: false, canBeAddedToBasket: false }
			},
			...(typeof n.stockQuantity === 'number'
				? {
						stock: {
							available: Math.max(n.stockQuantity, 0),
							total: Math.max(n.stockQuantity, 0),
							reserved: 0
						}
				  }
				: {}),
			createdAt: now,
			updatedAt: now
		};
		await collections.products.insertOne(product);

		// Image attachment: read URLs straight from the WC product's raw
		// payload (`raw.images[].src`) — no detour through the staged-image
		// collection. Each image is freshly downloaded and uploaded to S3,
		// bound to this product. No reuse of previous Picture documents,
		// which historically caused two bugs:
		// 1. Cross-job pollution (an image staged in another job could have
		//    its Picture re-bound to this product).
		// 2. Phantom Picture references (Picture._id deleted by the admin
		//    later left the staged.promotedAsId pointing nowhere; attaching
		//    silently no-op'd, the product looked imageless).
		const wcImages = (staged.raw.images as WcRawImage[] | undefined) ?? [];
		const expectedImages = wcImages.filter((i) => typeof i.src === 'string' && i.src).length;
		const imageIds: string[] = [];
		let order = 0;
		for (const img of wcImages) {
			if (typeof img.src !== 'string' || !img.src) continue;
			try {
				const pictureId = await importImageFromUrl({
					url: img.src,
					name: img.alt || img.name || `imported-${product._id}-${order + 1}`,
					productId: product._id
				});
				await collections.pictures.updateOne(
					{ _id: pictureId },
					{ $set: { order, updatedAt: new Date() } }
				);
				imageIds.push(pictureId);
				order++;
			} catch (err) {
				console.warn(
					`[product-promoter] could not import image ${img.src} for product ${_id}:`,
					err
				);
			}
		}

		// Require at least one image. Two failure modes:
		// - WC has 0 images (typically a draft/template product) → no image
		//   to migrate. Admin should add one in WP first.
		// - WC has N images but all imports failed (URL unreachable from
		//   be-BOP, hotlink protection, etc.) → can't end up with a broken
		//   product. Admin investigates network / WP host config.
		// In both cases, roll back the insert so the staging stays the
		// source of truth and there's no orphaned imageless product.
		if (imageIds.length === 0) {
			await collections.products.deleteOne({ _id: product._id });
			if (expectedImages === 0) {
				throw new Error(
					'Product creation aborted: this WooCommerce product has no images. ' +
						'Add at least one image in WordPress and re-fetch, or skip this product.'
				);
			}
			throw new Error(
				`Product creation aborted: WordPress lists ${expectedImages} image(s) for ` +
					'this product but none could be imported (URL unreachable from be-BOP). ' +
					'Check that the WP image URLs respond from the be-BOP server.'
			);
		}

		const label = `${product.name} (with ${imageIds.length} image${
			imageIds.length > 1 ? 's' : ''
		})`;

		return {
			promotedAsId: product._id,
			promotedAsLabel: label
		};
	}
};
