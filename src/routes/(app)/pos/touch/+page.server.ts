import { computePriceInfo } from '$lib/cart.js';
import { collections } from '$lib/server/database';
import {
	concludeOrderTab,
	getOrCreateOrderTab,
	orderTabNotEmptyAndFullyPaid
} from '$lib/server/orderTab.js';
import { picturesForProducts } from '$lib/server/picture';
import { pojo } from '$lib/server/pojo';
import { runtimeConfig } from '$lib/server/runtime-config';
import { UNDERLYING_CURRENCY } from '$lib/types/Currency.js';
import { OrderTab, OrderTabItem } from '$lib/types/OrderTab';
import { Picture } from '$lib/types/Picture.js';
import type { Product } from '$lib/types/Product';
import type { Tag } from '$lib/types/Tag';
import { error, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import type { PageServerParentData } from './$types.js';
import { UrlDependency } from '$lib/types/UrlDependency.js';
import { ObjectId } from 'mongodb';

async function getProductsToDisplay(params: {
	query: Record<string, unknown>;
	language?: string;
}): Promise<
	Pick<Product, '_id' | 'price' | 'name' | 'preorder' | 'availableDate' | 'tagIds' | 'stock'>[]
> {
	return collections.products
		.find({
			...params.query
		})
		.project<
			Pick<Product, '_id' | 'price' | 'name' | 'preorder' | 'availableDate' | 'tagIds' | 'stock'>
		>({
			price: 1,
			preorder: 1,
			name: params.language ? { $ifNull: [`$translations.${params.language}.name`, '$name'] } : 1,
			availableDate: 1,
			tagIds: 1,
			stock: 1
		})
		.sort({ createdAt: 1 })
		.toArray();
}

function defaultTab(): string {
	return 'tab-0';
}

type ProductProjection = Pick<
	Product,
	'_id' | 'name' | 'shortDescription' | 'vatProfileId' | 'variationLabels' | 'shipping' | 'price'
>;

type Locale = App.Locals['language'];

type HydratedTabItem = {
	internalNote: OrderTabItem['internalNote'];
	picture: Picture;
	product: Omit<ProductProjection, 'vatProfileId'> & { vatProfileId?: string };
	quantity: OrderTabItem['quantity'];
	tabItemId: string;
};

async function hydratedOrderItems(
	locale: Locale,
	tabItems: OrderTab['items']
): Promise<HydratedTabItem[]> {
	const [products, pictures] = await Promise.all([
		collections.products
			.find({
				_id: { $in: tabItems.map((it) => it.productId) }
			})
			.project<ProductProjection>({
				_id: 1,
				name: { $ifNull: [`$translations.${locale}.name`, '$name'] },
				price: 1,
				shortDescription: {
					$ifNull: [`$translations.${locale}.shortDescription`, '$shortDescription']
				},
				vatProfileId: 1,
				variationLabels: {
					$ifNull: [`$translations.${locale}.variationLabels`, '$variationLabels']
				}
			})
			.toArray(),
		picturesForProducts(tabItems.map((it) => it.productId))
	]);
	const productById = new Map(products.map((p) => [p._id, p]));
	const pictureById = new Map(pictures.map((p) => [p.productId, p]));

	return tabItems.flatMap((item) => {
		const product = productById.get(item.productId);
		const picture = pictureById.get(item.productId);
		if (!product || !picture) {
			return [];
		} else {
			return [
				{
					internalNote: item.internalNote && {
						value: item.internalNote.value,
						updatedAt: item.internalNote.updatedAt
					},
					picture,
					product: { ...product, vatProfileId: product.vatProfileId?.toString() },
					quantity: item.quantity,
					tabItemId: item._id.toString()
				}
			];
		}
	});
}

async function getHydratedOrderTab(locale: Locale, tabSlug: string) {
	const tab = await getOrCreateOrderTab({ slug: tabSlug });
	return { ...tab, items: await hydratedOrderItems(locale, tab.items) };
}

function getTabSlugFromPageOrRedirect(url: URL): string {
	const tabSlug = url.searchParams.get('tab');
	if (tabSlug === null) {
		const newUrl = new URL(url);
		newUrl.searchParams.set('tab', defaultTab());
		throw redirect(303, newUrl.toString());
	}
	return tabSlug;
}

async function tabPriceInfo(
	items: HydratedTabItem[],
	country: App.Locals['countryCode'],
	vatProfiles: PageServerParentData['vatProfiles']
) {
	return computePriceInfo(items, {
		bebopCountry: runtimeConfig.vatCountry,
		deliveryFees: {
			amount: 0,
			currency: UNDERLYING_CURRENCY
		},
		freeProductUnits: {},
		userCountry: country,
		vatExempted: runtimeConfig.vatExempted,
		vatNullOutsideSellerCountry: runtimeConfig.vatNullOutsideSellerCountry,
		vatSingleCountry: runtimeConfig.vatSingleCountry,
		vatProfiles
	});
}

export const load = async ({ locals, url, parent, depends }) => {
	const tabSlug = getTabSlugFromPageOrRedirect(url);
	depends(UrlDependency.orderTab(tabSlug));

	if (await orderTabNotEmptyAndFullyPaid({ slug: tabSlug })) {
		await concludeOrderTab({ slug: tabSlug });
	}

	const orderTab = await getHydratedOrderTab(locals.language, tabSlug);
	const products = await getProductsToDisplay({
		language: locals.language,
		query: locals.user?.hasPosOptions
			? { 'actionSettings.retail.visible': true }
			: { 'actionSettings.eShop.visible': true }
	});
	const tags = await collections.tags
		.find({ _id: { $in: [...runtimeConfig.posTouchTag] } })
		.project<Pick<Tag, '_id' | 'name'>>({ _id: 1, name: 1 })
		.toArray();
	const { vatProfiles } = await parent();
	const priceInfo = await tabPriceInfo(orderTab.items, locals.countryCode, vatProfiles);
	return {
		orderTab: pojo(orderTab),
		pictures: await collections.pictures
			.find({ productId: { $in: [...products.map((product) => product._id)] } })
			.sort({ order: 1, createdAt: 1 })
			.toArray(),
		priceInfo,
		products,
		tabSlug,
		tags
	};
};

function parseUpdateOrderTabItemReq(formData: FormData) {
	return z
		.object({
			note: z.string().trim().min(0),
			quantity: z.coerce.number().min(0).max(100),
			tabItemId: z.string().trim().min(1),
			tabSlug: z.string().trim().min(1)
		})
		.parse({
			note: formData.get('note'),
			quantity: formData.get('quantity'),
			tabItemId: formData.get('tabItemId'),
			tabSlug: formData.get('tabSlug')
		});
}

export const actions = {
	updateOrderTabItem: async ({ locals, request }) => {
		const { note, quantity, tabSlug, tabItemId } = parseUpdateOrderTabItemReq(
			await request.formData()
		);
		const orderTab = await getHydratedOrderTab(locals.language, tabSlug);

		if (!ObjectId.isValid(tabItemId)) {
			throw error(400, 'The specified tab item is invalid');
		}

		let res;
		if (quantity === 0) {
			res = await collections.orderTabs.updateOne(
				{ _id: orderTab._id },
				{
					$pull: {
						items: { _id: new ObjectId(tabItemId) }
					}
				}
			);
		} else {
			res = await collections.orderTabs.updateOne(
				{ _id: orderTab._id },
				{
					$set: {
						'items.$[elem].internalNote': {
							value: note,
							updatedAt: new Date(),
							updatedById: locals.user?._id
						},
						'items.$[elem].quantity': quantity
					}
				},
				{ arrayFilters: [{ 'elem._id': new ObjectId(tabItemId) }] }
			);
		}

		if (!res.matchedCount) {
			throw error(404, 'The specified line is not in the order tab');
		}
	}
};
