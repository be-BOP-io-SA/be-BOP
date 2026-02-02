import { collections } from '$lib/server/database';
import { getOrCreateOrderTab } from '$lib/server/orderTab';
import { pojo } from '$lib/server/pojo';
import type { OrderTab } from '$lib/types/OrderTab';
import type { Price } from '$lib/types/Order';
import { json } from '@sveltejs/kit';

type Locale = App.Locals['language'];

type ProductProjection = {
	_id: string;
	name: string;
	price: Price;
	vatProfileId?: string;
	shipping: boolean;
};

type HydratedItem = {
	_id: string;
	product: ProductProjection;
	quantity: number;
	printedQuantity?: number;
	internalNote?: {
		value: string;
		updatedAt: Date;
	};
};

async function hydratedOrderItems(
	locale: Locale,
	tabItems: OrderTab['items']
): Promise<HydratedItem[]> {
	const products = await collections.products
		.find({
			_id: { $in: tabItems.map((it) => it.productId) }
		})
		.project<ProductProjection>({
			_id: 1,
			name: { $ifNull: [`$translations.${locale}.name`, '$name'] },
			price: 1,
			vatProfileId: 1,
			shipping: 1
		})
		.toArray();

	const productById = new Map(products.map((p) => [p._id, p]));

	return tabItems
		.map((item) => {
			const product = productById.get(item.productId);
			if (!product) {
				return undefined;
			}

			return {
				_id: item._id.toString(),
				product: { ...product, vatProfileId: product.vatProfileId?.toString() },
				quantity: item.quantity,
				printedQuantity: item.printedQuantity,
				internalNote: item.internalNote && {
					value: item.internalNote.value,
					updatedAt: item.internalNote.updatedAt
				}
			};
		})
		.filter((item): item is NonNullable<typeof item> => item !== undefined);
}

export const GET = async ({ params, locals }) => {
	const tab = await getOrCreateOrderTab({ slug: params.slug });
	const items = await hydratedOrderItems(locals.language, tab.items);
	return json(pojo(items));
};
