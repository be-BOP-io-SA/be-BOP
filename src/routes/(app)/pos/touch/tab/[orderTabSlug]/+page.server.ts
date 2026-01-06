import { collections } from '$lib/server/database';
import {
	concludeOrderTab,
	getOrCreateOrderTab,
	hasSharesPaymentStarted,
	orderTabNotEmptyAndFullyPaid
} from '$lib/server/orderTab.js';
import { picturesForProducts } from '$lib/server/picture';
import { pojo } from '$lib/server/pojo';
import { OrderTab, OrderTabItem, OrderTabPoolStatus } from '$lib/types/OrderTab';
import type { Picture } from '$lib/types/Picture.js';
import type { Product } from '$lib/types/Product';
import { error } from '@sveltejs/kit';
import { z } from 'zod';
import { UrlDependency } from '$lib/types/UrlDependency.js';
import { ObjectId } from 'mongodb';
import { runtimeConfig, defaultConfig } from '$lib/server/runtime-config.js';

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

const discountSchema = z
	.object({
		percentage: z.number().min(0).max(99),
		tagId: z.string().optional(),
		motive: z.string().max(500).optional()
	})
	.nullable();

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

	const initialOrderTab = await getHydratedOrderTab(locals.language, tabSlug);

	const [shouldConclude, printTags, tagGroupsData, itemRemovalBlocked] = await Promise.all([
		orderTabNotEmptyAndFullyPaid({ slug: tabSlug }),
		collections.tags
			.find({ printReceiptFilter: true })
			.project<{ _id: string; name: string }>({ _id: 1, name: 1 })
			.toArray(),
		(async () => {
			const groups = await collections.tagGroups.find().sort({ order: 1 }).toArray();
			const tagIds = groups.flatMap((g) => g.tagIds);
			const tags = await collections.tags
				.find({ _id: { $in: tagIds } })
				.project<{ _id: string; name: string }>({ _id: 1, name: 1 })
				.toArray();

			return {
				groups: groups.map((g) => pojo(g)),
				tags: tags.map((t) => pojo(t))
			};
		})(),
		hasSharesPaymentStarted(initialOrderTab._id)
	]);

	let orderTab;
	if (shouldConclude) {
		await concludeOrderTab({ slug: tabSlug });
		orderTab = await getHydratedOrderTab(locals.language, tabSlug);
	} else {
		orderTab = initialOrderTab;
	}

	const allOrderTabs = await collections.orderTabs
		.aggregate<OrderTabPoolStatus>([{ $project: { slug: 1, itemsCount: { $size: '$items' } } }])
		.toArray();

	const printTagsMap = Object.fromEntries(printTags.map((tag) => [tag._id, tag.name]));

	return {
		orderTab: pojo(orderTab),
		posTabGroups: runtimeConfig.posTabGroups,
		posPoolEmptyIcon: runtimeConfig.posPoolEmptyIcon ?? defaultConfig.posPoolEmptyIcon,
		posPoolOccupiedIcon: runtimeConfig.posPoolOccupiedIcon ?? defaultConfig.posPoolOccupiedIcon,
		allOrderTabs: pojo(allOrderTabs),
		tabSlug,
		posUseSelectForTags: runtimeConfig.posUseSelectForTags,
		printTags: pojo(printTags),
		tagGroups: tagGroupsData.groups,
		posTouchScreenTags: tagGroupsData.tags,
		printTagsMap,
		itemRemovalBlocked
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

		const orderTab = await getOrCreateOrderTab({ slug: tabSlug });

		if (await hasSharesPaymentStarted(orderTab._id)) {
			throw error(403, 'sharesPaymentStarted');
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
					},
					$unset: {
						'items.$.internalNote': 1
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
	},
	updateDiscount: async ({ request, params }) => {
		const formData = await request.formData();
		const discountJson = formData.get('discount');

		if (typeof discountJson !== 'string') {
			throw error(400, 'Invalid discount data');
		}

		const discount = discountSchema.parse(JSON.parse(discountJson));

		const orderTab = await collections.orderTabs.findOne(
			{ slug: params.orderTabSlug },
			{ projection: { processedPayments: 1 } }
		);

		if (!orderTab) {
			throw error(404, 'Order tab not found');
		}

		if (orderTab.processedPayments?.length) {
			throw error(403, 'Cannot modify discount after payment has started');
		}

		await collections.orderTabs.updateOne(
			{ slug: params.orderTabSlug },
			discount && discount.percentage > 0
				? { $set: { discount, updatedAt: new Date() } }
				: { $unset: { discount: 1 }, $set: { updatedAt: new Date() } }
		);
	}
};
