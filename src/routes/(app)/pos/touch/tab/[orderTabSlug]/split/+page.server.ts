import { ItemForPriceInfo, ProductForPriceInfo } from '$lib/cart';
import { collections } from '$lib/server/database';
import { clearAbandonedCartsAndOrdersFromTab, getOrCreateOrderTab } from '$lib/server/orderTab';
import { OrderTab } from '$lib/types/OrderTab';
import { UrlDependency } from '$lib/types/UrlDependency';

type Locale = App.Locals['language'];
type ProductProjection = ProductForPriceInfo & { name: string };

type HydratedTabItem = {
	internalNote?: {
		value: string;
		updatedAt: Date;
	};
	product: Omit<ProductProjection, 'vatProfileId'> & { vatProfileId?: string };
	quantity: number;
	tabItemId: string;
};

async function hydratedOrderItems(
	locale: Locale,
	tabItems: OrderTab['items']
): Promise<HydratedTabItem[]> {
	const products = await collections.products
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
		.toArray();
	const productById = new Map(products.map((p) => [p._id, p]));
	return tabItems
		.map((item) => {
			const product = productById.get(item.productId);
			if (product) {
				return {
					internalNote: item.internalNote && {
						value: item.internalNote.value,
						updatedAt: item.internalNote.updatedAt
					},
					product: { ...product, vatProfileId: product.vatProfileId?.toString() },
					quantity: item.quantity,
					tabItemId: item._id.toString()
				};
			}
		})
		.filter((item): item is NonNullable<typeof item> => item !== undefined);
}

async function getHydratedOrderTab(locale: Locale, tabSlug: string) {
	const tab = await getOrCreateOrderTab({ slug: tabSlug });
	return { slug: tab.slug, items: await hydratedOrderItems(locale, tab.items) };
}

export const load = async ({ depends, locals, params }) => {
	const tabSlug = params.orderTabSlug;
	await clearAbandonedCartsAndOrdersFromTab(tabSlug);
	const orderTab = await getHydratedOrderTab(locals.language, tabSlug);
	depends(UrlDependency.orderTab(tabSlug));

	orderTab.items satisfies ItemForPriceInfo[];
	return {
		orderTab,
		tabSlug
	};
};
