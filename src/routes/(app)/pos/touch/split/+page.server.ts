import { ItemForPriceInfo, ProductForPriceInfo } from '$lib/cart';
import { collections } from '$lib/server/database';
import { clearAbandonedCartsAndOrdersFromTab, getOrCreateOrderTab } from '$lib/server/orderTab';
import { OrderTab, OrderTabItem } from '$lib/types/OrderTab';
import { UrlDependency } from '$lib/types/UrlDependency';
import { redirect } from '@sveltejs/kit';

type Locale = App.Locals['language'];
type ProductProjection = ProductForPriceInfo & { name: string };

type HydratedTabItem = {
	internalNote: OrderTabItem['internalNote'];
	product: ProductProjection;
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
					internalNote: item.internalNote,
					product,
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

function getTabSlugFromPageOrRedirect(url: URL): string {
	const tabSlug = url.searchParams.get('tab');
	if (tabSlug === null) {
		throw redirect(303, '/pos/touch');
	}
	return tabSlug;
}

export const load = async ({ depends, locals, url }) => {
	const tabSlug = getTabSlugFromPageOrRedirect(url);
	await clearAbandonedCartsAndOrdersFromTab(tabSlug);
	const orderTab = await getHydratedOrderTab(locals.language, tabSlug);
	depends(UrlDependency.orderTab(tabSlug));

	orderTab.items satisfies ItemForPriceInfo[];
	return {
		orderTab,
		tabSlug
	};
};
