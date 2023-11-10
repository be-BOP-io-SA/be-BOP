import type { Challenge } from '$lib/types/Challenge';
import type { DigitalFile } from '$lib/types/DigitalFile';
import type { Product } from '$lib/types/Product';
import { POS_ROLE_ID } from '$lib/types/User';
import { trimPrefix } from '$lib/utils/trimPrefix';
import { trimSuffix } from '$lib/utils/trimSuffix';
import { collections } from './database';
import { picturesForProducts, picturesForSliders } from './picture';

export async function cmsFromContent(content: string, userRoleId: string | undefined) {
	const PRODUCT_WIDGET_REGEX =
		/\[Product=(?<slug>[a-z0-9-]+)(?:\?display=(?<display>[a-z0-9-]+))?\]/gi;
	const CHALLENGE_WIDGET_REGEX = /\[Challenge=(?<slug>[a-z0-9-]+)\]/gi;
	const SLIDER_WIDGET_REGEX =
		/\[Slider=(?<slug>[a-z0-9-]+)(?:\?autoplay=(?<autoplay>[a-z0-9-]+))?\]/gi;

	const productSlugs = new Set<string>();
	const challengeSlugs = new Set<string>();
	const sliderSlugs = new Set<string>();

	const tokens: Array<
		| {
				type: 'html';
				raw: string;
		  }
		| {
				type: 'productWidget';
				slug: string;
				display: string | undefined;
				raw: string;
		  }
		| {
				type: 'challengeWidget';
				slug: string;
				raw: string;
		  }
		| {
				type: 'sliderWidget';
				slug: string;
				autoplay: number | undefined;
				raw: string;
		  }
	> = [];

	const productMatches = content.matchAll(PRODUCT_WIDGET_REGEX);
	const challengeMatches = content.matchAll(CHALLENGE_WIDGET_REGEX);
	const sliderMatches = content.matchAll(SLIDER_WIDGET_REGEX);

	let index = 0;

	const orderedMatches = [
		...[...productMatches].map((m) =>
			Object.assign(m, { index: m.index ?? 0, type: 'productWidget' })
		),
		...[...challengeMatches].map((m) =>
			Object.assign(m, { index: m.index ?? 0, type: 'challengeWidget' })
		),
		...[...sliderMatches].map((m) =>
			Object.assign(m, { index: m.index ?? 0, type: 'sliderWidget' })
		)
	].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

	for (const match of orderedMatches) {
		tokens.push({
			type: 'html',
			raw: trimPrefix(trimSuffix(content.slice(index, match.index), '<p>'), '</p>')
		});
		if (match.type === 'productWidget' && match.groups?.slug) {
			productSlugs.add(match.groups.slug);
			tokens.push({
				type: 'productWidget',
				slug: match.groups.slug,
				display: match.groups?.display,
				raw: match[0]
			});
		} else if (match.type === 'challengeWidget' && match.groups?.slug) {
			challengeSlugs.add(match.groups.slug);
			tokens.push({
				type: 'challengeWidget',
				slug: match.groups.slug,
				raw: match[0]
			});
		} else if (match.type === 'sliderWidget' && match.groups?.slug) {
			sliderSlugs.add(match.groups.slug);
			tokens.push({
				type: 'sliderWidget',
				slug: match.groups.slug,
				autoplay: Number(match.groups?.autoplay),
				raw: match[0]
			});
		}

		index = match.index + match[0].length;
	}

	tokens.push({
		type: 'html',
		raw: trimPrefix(content.slice(index), '</p>')
	});
	const query =
		userRoleId === POS_ROLE_ID
			? { 'actionSettings.retail.visible': true }
			: { 'actionSettings.eShop.visible': true };

	const products = await collections.products
		.find({
			_id: { $in: [...productSlugs] },
			...query
		})
		.project<
			Pick<
				Product,
				| '_id'
				| 'price'
				| 'name'
				| 'shortDescription'
				| 'preorder'
				| 'availableDate'
				| 'type'
				| 'shipping'
				| 'actionSettings'
			>
		>({
			price: 1,
			shortDescription: 1,
			preorder: 1,
			name: 1,
			availableDate: 1,
			type: 1,
			shipping: 1,
			actionSettings: 1
		})
		.toArray();
	const challenges = await collections.challenges
		.find({
			_id: { $in: [...challengeSlugs] }
		})
		.project<Pick<Challenge, '_id' | 'name' | 'goal' | 'progress' | 'endsAt'>>({
			name: 1,
			goal: 1,
			progress: 1,
			endsAt: 1
		})
		.toArray();
	const sliders = await collections.sliders
		.find({
			_id: { $in: [...sliderSlugs] }
		})
		.toArray();

	const digitalFiles = await collections.digitalFiles
		.find({})
		.project<Pick<DigitalFile, '_id' | 'name' | 'productId'>>({
			name: 1,
			productId: 1
		})
		.sort({ createdAt: 1 })
		.toArray();
	return {
		tokens,
		challenges,
		sliders,
		slidersPictures: await picturesForSliders(sliders.map((slider) => slider._id)),
		products,
		pictures: await picturesForProducts(products.map((product) => product._id)),
		digitalFiles
	};
}
