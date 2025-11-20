import { collections } from '$lib/server/database';
import {
	concludeOrderTab,
	getOrCreateOrderTab,
	orderTabNotEmptyAndFullyPaid
} from '$lib/server/orderTab.js';
import { picturesForProducts } from '$lib/server/picture';
import { pojo } from '$lib/server/pojo';
import { OrderTab, OrderTabItem } from '$lib/types/OrderTab';
import type { Picture } from '$lib/types/Picture.js';
import type { Product } from '$lib/types/Product';
import { error } from '@sveltejs/kit';
import { z } from 'zod';
import { UrlDependency } from '$lib/types/UrlDependency.js';
import { ObjectId } from 'mongodb';
import { runtimeConfig } from '$lib/server/runtime-config.js';

type ProductProjection = Pick<
	Product,
	| '_id'
	| 'name'
	| 'shortDescription'
	| 'vatProfileId'
	| 'variationLabels'
	| 'shipping'
	| 'price'
	| 'maxQuantityPerOrder'
	| 'tagIds'
>;

type Locale = App.Locals['language'];

type HydratedTabItem = {
	internalNote: OrderTabItem['internalNote'];
	picture: Picture;
	product: Omit<ProductProjection, 'vatProfileId'> & { vatProfileId?: string };
	quantity: OrderTabItem['quantity'];
	tabItemId: string;
	printStatus: OrderTabItem['printStatus'];
	printedQuantity: OrderTabItem['printedQuantity'];
	chosenVariations: OrderTabItem['chosenVariations'];
};

const printHistoryEntrySchema = z.object({
	timestamp: z.coerce.date(),
	poolLabel: z.string(),
	itemCount: z.number(),
	tagNames: z.array(z.string()),
	tagGroups: z.array(
		z.object({
			tagNames: z.array(z.string()),
			items: z.array(
				z.object({
					product: z.object({ name: z.string() }),
					quantity: z.number(),
					variations: z.array(z.object({ text: z.string(), count: z.number() })),
					notes: z.array(z.string())
				})
			)
		})
	)
});

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
				},
				tagIds: 1,
				maxQuantityPerOrder: 1
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
					tabItemId: item._id.toString(),
					printStatus: item.printStatus,
					printedQuantity: item.printedQuantity,
					chosenVariations: item.chosenVariations
				}
			];
		}
	});
}

async function getHydratedOrderTab(locale: Locale, tabSlug: string) {
	const tab = await getOrCreateOrderTab({ slug: tabSlug });
	const items = await hydratedOrderItems(locale, tab.items);
	return { ...tab, items };
}

export const load = async ({ locals, depends, params }) => {
	const tabSlug = params.orderTabSlug;
	depends(UrlDependency.orderTab(tabSlug));

	const [shouldConclude, initialOrderTab, printTags, posTouchScreenTags] = await Promise.all([
		orderTabNotEmptyAndFullyPaid({ slug: tabSlug }),
		getHydratedOrderTab(locals.language, tabSlug),
		collections.tags
			.find({ printReceiptFilter: true })
			.project<{ _id: string; name: string }>({ _id: 1, name: 1 })
			.toArray(),
		collections.tags
			.find({ _id: { $in: runtimeConfig.posTouchTag } })
			.project<{ _id: string; name: string }>({ _id: 1, name: 1 })
			.toArray()
	]);

	let orderTab;
	if (shouldConclude) {
		await concludeOrderTab({ slug: tabSlug });
		orderTab = await getHydratedOrderTab(locals.language, tabSlug);
	} else {
		orderTab = initialOrderTab;
	}

	const printTagsMap = Object.fromEntries(printTags.map((tag) => [tag._id, tag.name]));

	return {
		orderTab: pojo(orderTab),
		posTabGroups: runtimeConfig.posTabGroups,
		tabSlug,
		posUseSelectForTags: runtimeConfig.posUseSelectForTags,
		printTags: pojo(printTags),
		posTouchScreenTags: pojo(posTouchScreenTags),
		printTagsMap
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
		if (!ObjectId.isValid(tabItemId)) {
			throw error(400, 'The specified tab item is invalid');
		}

		let res;
		if (quantity === 0) {
			res = await collections.orderTabs.updateOne(
				{ slug: tabSlug },
				{
					$pull: {
						items: { _id: new ObjectId(tabItemId) }
					}
				}
			);
		} else {
			res = await collections.orderTabs.updateOne(
				{ slug: tabSlug },
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
	},
	updatePrintStatus: async ({ request, params }) => {
		const formData = await request.formData();
		const { updates } = z
			.object({
				updates: z.string()
			})
			.parse({
				updates: formData.get('updates')
			});

		const parsedUpdates = JSON.parse(updates) as Array<{
			itemId: string;
			currentQuantity: number;
		}>;

		for (const update of parsedUpdates) {
			await collections.orderTabs.updateOne(
				{ slug: params.orderTabSlug, 'items._id': new ObjectId(update.itemId) },
				{
					$set: {
						'items.$.printStatus': 'acknowledged',
						'items.$.printedQuantity': update.currentQuantity,
						updatedAt: new Date()
					}
				}
			);
		}
	},
	savePrintHistory: async ({ request, params }) => {
		const formData = await request.formData();
		const { entry } = z
			.object({
				entry: z.string()
			})
			.parse({
				entry: formData.get('entry')
			});

		const parsedEntry = printHistoryEntrySchema.parse(JSON.parse(entry));

		await collections.orderTabs.updateOne(
			{ slug: params.orderTabSlug },
			{
				$push: {
					printHistory: {
						$each: [parsedEntry],
						$slice: -30
					}
				},
				$set: { updatedAt: new Date() }
			}
		);
	}
};
