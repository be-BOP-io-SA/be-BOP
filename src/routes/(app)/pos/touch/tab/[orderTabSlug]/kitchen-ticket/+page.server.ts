import { collections } from '$lib/server/database';
import { buildTagGroupsForPrint, getOrCreateOrderTab } from '$lib/server/orderTab';

export async function load({ locals, params, url }) {
	const tab = await getOrCreateOrderTab({ slug: params.orderTabSlug });

	const poolLabel = params.orderTabSlug
		.split('-')
		.map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');

	const mode = (url.searchParams.get('mode') ?? 'all') as 'all' | 'newlyOrdered';
	const tagFilter = url.searchParams.get('tagFilter');
	const historyIndex = url.searchParams.get('historyIndex');

	if (historyIndex !== null) {
		const index = parseInt(historyIndex, 10);
		const historyEntry = tab.printHistory?.[index];

		return {
			layoutReset: true,
			poolLabel: historyEntry?.poolLabel ?? poolLabel,
			generatedAt: new Date(),
			tagGroups: historyEntry?.tagGroups ?? [],
			showBebopLogo: false
		};
	}

	const products = await collections.products
		.find({ _id: { $in: tab.items.map((it) => it.productId) } })
		.project<{ _id: string; name: string; tagIds?: string[] }>({
			_id: 1,
			name: { $ifNull: [`$translations.${locals.language}.name`, '$name'] },
			tagIds: 1
		})
		.toArray();
	const productById = new Map(products.map((p) => [p._id.toString(), p]));

	const printTags = await collections.tags
		.find({ printReceiptFilter: true })
		.project<{ _id: string; name: string }>({ _id: 1, name: 1 })
		.toArray();
	const printTagsMap = Object.fromEntries(printTags.map((t) => [t._id, t.name]));

	const enrichedItems = tab.items
		.map((item) => {
			const product = productById.get(item.productId.toString());
			if (!product) {
				return null;
			}
			return { ...item, product };
		})
		.filter((item): item is NonNullable<typeof item> => {
			if (!item) {
				return false;
			}
			if (tagFilter && !item.product.tagIds?.includes(tagFilter)) {
				return false;
			}
			return true;
		});

	const { tagGroups } = buildTagGroupsForPrint(enrichedItems, printTagsMap, mode);

	return {
		layoutReset: true,
		poolLabel,
		generatedAt: new Date(),
		tagGroups,
		showBebopLogo: false
	};
}
