import type { Challenge } from '$lib/types/Challenge';
import type { DigitalFile } from '$lib/types/DigitalFile';
import type { Product } from '$lib/types/Product';
import type { Picture } from '$lib/types/Picture';
import type { Currency } from '$lib/types/Currency';
import { trimPrefix } from '$lib/utils/trimPrefix';
import { trimSuffix } from '$lib/utils/trimSuffix';
import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';
import { collections } from './database';
import { ALLOW_JS_INJECTION } from '$lib/server/env-config';
import type { PickDeep } from 'type-fest';
import type { Specification } from '$lib/types/Specification';
import type { Tag } from '$lib/types/Tag';
import type { ContactForm } from '$lib/types/ContactForm';
import type { Countdown } from '$lib/types/Countdown';
import type { Gallery } from '$lib/types/Gallery';
import type { Leaderboard } from '$lib/types/Leaderboard';
import type { ScheduleEventBooked } from '$lib/types/Schedule';
import { groupBy } from '$lib/utils/group-by';
import { subMinutes } from 'date-fns';
import { z } from 'zod';
import type { ProductWidgetProduct } from '$lib/components/ProductWidget/ProductWidgetProduct';
export type ExternalProductData = ProductWidgetProduct & {
	externalUrl: string;
	pictures: Picture[];
};

const window = new JSDOM('').window;

const purify = DOMPurify(window);

purify.addHook('afterSanitizeAttributes', function (node) {
	// set all elements owning target to target=_blank
	if ('target' in node) {
		node.setAttribute('target', '_blank');
		node.setAttribute('rel', 'noopener');
	}
});

// Zod schema for external product picture validation
const externalPictureSchema = z.object({
	_id: z.string(),
	name: z.string(),
	storage: z.object({
		original: z.object({
			key: z.string(),
			width: z.number(),
			height: z.number(),
			size: z.number(),
			url: z.string().optional()
		}),
		formats: z.array(
			z.object({
				key: z.string(),
				width: z.number(),
				height: z.number(),
				size: z.number(),
				url: z.string().optional()
			})
		)
	})
});

// Zod schema for external product data validation
const externalProductSchema = z.object({
	name: z.string(),
	shortDescription: z.string(),
	price: z.object({
		amount: z.number(),
		currency: z.string()
	}),
	pictures: z.array(externalPictureSchema).optional()
});

async function fetchExternalProduct(url: string): Promise<ExternalProductData | null> {
	try {
		// Parse URL to extract base and slug
		const urlObj = new URL(url);
		const pathMatch = urlObj.pathname.match(/\/product\/([^\/]+)/);

		if (!pathMatch) {
			console.error(
				`[fetchExternalProduct] Invalid product URL format (expected /product/[slug]): ${url}`
			);
			return null;
		}

		const slug = pathMatch[1];
		const apiUrl = `${urlObj.origin}/api/product/${slug}`;

		const response = await fetch(apiUrl, {
			headers: { Accept: 'application/json' },
			signal: AbortSignal.timeout(5000) // 5s timeout
		});

		if (!response.ok) {
			console.error(
				`[fetchExternalProduct] Failed to fetch ${apiUrl}: ${response.status} ${response.statusText}`
			);
			return null;
		}

		const rawData = await response.json();

		// Runtime validation with Zod
		const parseResult = externalProductSchema.safeParse(rawData);

		if (!parseResult.success) {
			console.error('[fetchExternalProduct] Invalid external product data:', parseResult.error);
			return null;
		}

		// Map to ProductWidgetProduct with safe defaults
		// Use slug from URL as _id - we don't rely on external API's _id
		const result = {
			_id: slug,
			name: parseResult.data.name,
			shortDescription: parseResult.data.shortDescription,
			price: {
				amount: parseResult.data.price.amount,
				currency: parseResult.data.price.currency as Currency
			},
			externalUrl: url,
			pictures: (parseResult.data.pictures ?? []) as Picture[],
			// Required ProductWidgetProduct fields with safe defaults
			preorder: false,
			availableDate: undefined,
			shipping: false,
			type: 'resource' as const,
			actionSettings: {
				eShop: { visible: true, canBeAddedToBasket: false },
				retail: { visible: false, canBeAddedToBasket: false },
				googleShopping: { visible: false },
				nostr: { visible: false, canBeAddedToBasket: false }
			},
			stock: { available: 999999, total: 999999, reserved: 0 },
			isTicket: false,
			hasSellDisclaimer: false,
			payWhatYouWant: false,
			bookingSpec: undefined,
			hasVariations: false
		};

		return result;
	} catch (err) {
		console.error('[fetchExternalProduct] Error fetching external product:', err);
		return null;
	}
}

type TokenObject =
	| {
			type: 'html';
			raw: string;
	  }
	| {
			type: 'productWidget';
			slug?: string;
			externalUrl?: string;
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
	| {
			type: 'tagWidget';
			slug: string;
			display: string | undefined;
			titleCase: string | undefined;
			raw: string;
	  }
	| {
			type: 'specificationWidget';
			slug: string;
			raw: string;
	  }
	| {
			type: 'pictureWidget';
			slug: string;
			raw: string;
			msubstitute?: string | undefined;
			fit?: 'cover' | 'contain';
			width?: number;
			height?: number;
			position?: 'right' | 'center' | 'full-width';
	  }
	| { type: 'contactFormWidget'; slug: string; raw: string }
	| { type: 'countdownWidget'; slug: string; raw: string }
	| {
			type: 'tagProducts';
			slug: string;
			display: string | undefined;
			sort?: 'asc' | 'desc';
			by?: string;
			raw: string;
	  }
	| {
			type: 'galleryWidget';
			slug: string;
			display: string | undefined;
			raw: string;
	  }
	| {
			type: 'leaderboardWidget';
			slug: string;
			raw: string;
	  }
	| { type: 'qrCode'; slug: string; raw: string }
	| { type: 'currencyCalculatorWidget'; slug: string; raw: string }
	| {
			type: 'scheduleWidget';
			slug: string;
			display: string | undefined;
			raw: string;
	  };

export async function cmsFromContent(
	{
		desktopContent,
		mobileContent,
		employeeContent,
		forceContentVersion,
		forceUnsanitizedContent
	}: {
		desktopContent: string;
		employeeContent?: string;
		mobileContent?: string;
		forceContentVersion?: 'desktop' | 'mobile' | 'employee';
		forceUnsanitizedContent?: boolean;
	},
	locals: Partial<PickDeep<App.Locals, 'user.hasPosOptions' | 'language' | 'email' | 'sso'>>
) {
	/**
	 * Matches product widget syntax in CMS content:
	 * - [Product=slug] for local products
	 * - [Product=https://example.com/product/slug] for external products
	 * - [Product=slug display=img-5] or [Product=slug?display=img-5] for display options
	 *
	 * Named groups:
	 * - slug: either full URL (http/https) or local slug (unicode letters, digits, _, -)
	 * - display: optional display variant (img-0 through img-6)
	 */
	const PRODUCT_WIDGET_REGEX =
		/\[Product=(?<slug>https?:\/\/[^\s\]]+|[\p{L}\d_-]+)(?:[?\s]display=(?<display>[a-z0-9-]+))?\]/giu;
	const CHALLENGE_WIDGET_REGEX = /\[Challenge=(?<slug>[a-z0-9-]+)\]/giu;
	const LEADERBOARD_WIDGET_REGEX = /\[Leaderboard=(?<slug>[a-z0-9-]+)\]/giu;
	const SLIDER_WIDGET_REGEX =
		/\[Slider=(?<slug>[\p{L}\d_-]+)(?:[?\s]autoplay=(?<autoplay>[\d]+))?\]/giu;
	const TAG_WIDGET_REGEX =
		/\[Tag=(?<slug>[\p{L}\d_-]+)(?:[?\s]display=(?<display>[a-z0-9-]+))?(?:[?\s]titleCase=(?<titleCase>(upper|regular)))?\]/giu;

	const SPECIFICATION_WIDGET_REGEX = /\[Specification=(?<slug>[\p{L}\d_-]+)\]/giu;
	const PICTURE_WIDGET_REGEX =
		/\[Picture=(?<slug>[\p{L}\d_-]+)((?:[?\s]msubstitute=(?<msubstitute>[\p{L}\d_-]+))?(?:[?\s]width=(?<width>\d+))?(?:[?\s]height=(?<height>\d+))?(?:[?\s]fit=(?<fit>cover|contain))?(?:[?\s]position=(?<position>right|center|full-width))?)*\]/giu;
	const CONTACTFORM_WIDGET_REGEX = /\[Form=(?<slug>[\p{L}\d_-]+)\]/giu;
	const COUNTDOWN_WIDGET_REGEX = /\[Countdown=(?<slug>[\p{L}\d_-]+)\]/giu;
	const TAG_PRODUCTS_REGEX =
		/\[TagProducts=(?<slug>[\p{L}\d_-]+)(?:[?\s]display=(?<display>[a-z0-9-]+))?(?:[?\s]sort=(?<sort>asc|desc))?(?:[?\s]by=(?<by>[a-z0-9-]+))?\]/giu;

	const GALLERY_WIDGET_REGEX =
		/\[Gallery=(?<slug>[\p{L}\d_-]+)(?:[?\s]display=(?<display>[a-z0-9-]+))?\]/giu;
	const QRCODE_REGEX = /\[QRCode=(?<slug>[\p{L}\d_-]+)\]/giu;
	const CURRENCY_CALCULATOR_WIDGET_REGEX = /\[CurrencyCalculator=(?<slug>[a-z0-9-]+)\]/giu;
	const SCHEDULE_WIDGET_REGEX =
		/\[Schedule=(?<slug>[\p{L}\d_:-]+)(?:[?\s]display=(?<display>(main|main-light|list|calendar)))?\]/giu;

	const productSlugs = new Set<string>();
	const externalProductUrls = new Set<string>();
	const challengeSlugs = new Set<string>();
	const sliderSlugs = new Set<string>();
	const tagSlugs = new Set<string>();
	const specificationSlugs = new Set<string>();
	const pictureSlugs = new Set<string>();
	const contactFormSlugs = new Set<string>();
	const countdownFormSlugs = new Set<string>();
	const tagProductsSlugs = new Set<string>();
	const gallerySlugs = new Set<string>();
	const leaderboardSlugs = new Set<string>();
	const qrCodeSlugs = new Set<string>();
	const currencyCalculatorSlugs = new Set<string>();
	const scheduleSlugs = new Set<string>();

	function matchAndSort(content: string, regex: RegExp, type: string) {
		const regexMatches = [...content.matchAll(regex)];
		return regexMatches
			.map((m) => Object.assign(m, { index: m.index ?? 0, type }))
			.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
	}

	const index = 0;

	const processMatches = (token: TokenObject[], content: string, index: number) => {
		const matches = [
			...matchAndSort(content, PRODUCT_WIDGET_REGEX, 'productWidget'),
			...matchAndSort(content, CHALLENGE_WIDGET_REGEX, 'challengeWidget'),
			...matchAndSort(content, SLIDER_WIDGET_REGEX, 'sliderWidget'),
			...matchAndSort(content, TAG_WIDGET_REGEX, 'tagWidget'),
			...matchAndSort(content, SPECIFICATION_WIDGET_REGEX, 'specificationWidget'),
			...matchAndSort(content, CONTACTFORM_WIDGET_REGEX, 'contactFormWidget'),
			...matchAndSort(content, PICTURE_WIDGET_REGEX, 'pictureWidget'),
			...matchAndSort(content, COUNTDOWN_WIDGET_REGEX, 'countdownWidget'),
			...matchAndSort(content, TAG_PRODUCTS_REGEX, 'tagProducts'),
			...matchAndSort(content, GALLERY_WIDGET_REGEX, 'galleryWidget'),
			...matchAndSort(content, LEADERBOARD_WIDGET_REGEX, 'leaderboardWidget'),
			...matchAndSort(content, QRCODE_REGEX, 'qrCode'),
			...matchAndSort(content, CURRENCY_CALCULATOR_WIDGET_REGEX, 'currencyCalculatorWidget'),
			...matchAndSort(content, SCHEDULE_WIDGET_REGEX, 'scheduleWidget')
		].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
		for (const match of matches) {
			const html = trimPrefix(trimSuffix(content.slice(index, match.index), '<p>'), '</p>');
			const displayUnsanitizedContent = ALLOW_JS_INJECTION === 'true' || forceUnsanitizedContent;
			token.push({
				type: 'html',
				raw: displayUnsanitizedContent ? html : purify.sanitize(html, { ADD_ATTR: ['target'] })
			});
			if (match.groups?.slug) {
				switch (match.type) {
					case 'productWidget':
						const slugOrUrl = match.groups.slug;
						if (slugOrUrl.startsWith('http://') || slugOrUrl.startsWith('https://')) {
							// External product URL
							const url = new URL(slugOrUrl);
							const displayOption = url.searchParams.get('display') || match.groups?.display;
							url.searchParams.delete('display');

							externalProductUrls.add(url.href);
							token.push({
								type: 'productWidget',
								externalUrl: url.href,
								display: displayOption,
								raw: match[0]
							});
						} else {
							// Local product slug
							productSlugs.add(slugOrUrl);
							token.push({
								type: 'productWidget',
								slug: slugOrUrl,
								display: match.groups?.display,
								raw: match[0]
							});
						}
						break;
					case 'challengeWidget':
						challengeSlugs.add(match.groups.slug);
						token.push({
							type: 'challengeWidget',
							slug: match.groups.slug,
							raw: match[0]
						});
						break;
					case 'sliderWidget':
						sliderSlugs.add(match.groups.slug);
						token.push({
							type: 'sliderWidget',
							slug: match.groups.slug,
							autoplay: Number(match.groups?.autoplay),
							raw: match[0]
						});
						break;
					case 'tagWidget':
						tagSlugs.add(match.groups.slug);
						token.push({
							type: 'tagWidget',
							slug: match.groups.slug,
							display: match.groups?.display,
							titleCase: match.groups?.titleCase,
							raw: match[0]
						});
						break;
					case 'specificationWidget':
						specificationSlugs.add(match.groups.slug);
						token.push({
							type: 'specificationWidget',
							slug: match.groups.slug,
							raw: match[0]
						});
						break;
					case 'pictureWidget':
						pictureSlugs.add(match.groups.slug);
						pictureSlugs.add(match.groups.msubstitute);
						// With multiple options, to handle any ordering for the options, we need to parse the string again
						const raw = match[0];
						const fit = /[?\s]fit=(?<fit>(cover|contain))/.exec(raw)?.groups?.fit as
							| 'cover'
							| 'contain'
							| undefined;
						const width = /[?\s]width=(?<width>\d+)/.exec(raw)?.groups?.width;
						const height = /[?\s]height=(?<height>\d+)/.exec(raw)?.groups?.height;
						const position = /[?\s]position=(?<position>(right|center|full-width))/.exec(raw)
							?.groups?.position as 'right' | 'center' | 'full-width' | undefined;
						token.push({
							type: 'pictureWidget',
							slug: match.groups.slug,
							msubstitute: match.groups.msubstitute,
							raw,
							fit,
							width: width ? Number(width) : undefined,
							height: height ? Number(height) : undefined,
							position
						});
						break;
					case 'contactFormWidget':
						contactFormSlugs.add(match.groups.slug);
						token.push({
							type: 'contactFormWidget',
							slug: match.groups.slug,
							raw: match[0]
						});
						break;
					case 'countdownWidget':
						countdownFormSlugs.add(match.groups.slug);
						token.push({
							type: 'countdownWidget',
							slug: match.groups.slug,
							raw: match[0]
						});
						break;
					case 'tagProducts':
						tagProductsSlugs.add(match.groups.slug);
						const sort = /[?\s]sort=(?<sort>(asc|desc))/.exec(match[0])?.groups?.sort as
							| 'asc'
							| 'desc'
							| undefined;
						token.push({
							type: 'tagProducts',
							slug: match.groups.slug,
							display: match.groups?.display,
							sort,
							by: match.groups.by,
							raw: match[0]
						});
						break;
					case 'galleryWidget':
						gallerySlugs.add(match.groups.slug);
						token.push({
							type: 'galleryWidget',
							slug: match.groups.slug,
							display: match.groups?.display,
							raw: match[0]
						});
						break;
					case 'leaderboardWidget':
						leaderboardSlugs.add(match.groups.slug);
						token.push({
							type: 'leaderboardWidget',
							slug: match.groups.slug,
							raw: match[0]
						});
						break;
					case 'qrCode':
						qrCodeSlugs.add(match.groups.slug);
						token.push({
							type: 'qrCode',
							slug: match.groups.slug,
							raw: match[0]
						});
						break;
					case 'currencyCalculatorWidget':
						currencyCalculatorSlugs.add(match.groups.slug);
						token.push({
							type: 'currencyCalculatorWidget',
							slug: match.groups.slug,
							raw: match[0]
						});
						break;
					case 'scheduleWidget':
						scheduleSlugs.add(match.groups.slug);
						token.push({
							type: 'scheduleWidget',
							slug: match.groups.slug,
							display: match.groups?.display,
							raw: match[0]
						});
						break;
				}
			}
			index = match.index + match[0].length;
		}
		token.push({
			type: 'html',
			raw: trimPrefix(content.slice(index), '</p>')
		});
	};

	const tokens: {
		desktop: Array<TokenObject>;
		mobile?: Array<TokenObject>;
	} = {
		desktop: [],
		mobile: undefined // Reassigned later on adaptive content.
	};

	if (forceContentVersion === 'desktop' && desktopContent) {
		processMatches(tokens.desktop, desktopContent, index);
	} else if (forceContentVersion === 'employee' && employeeContent) {
		processMatches(tokens.desktop, employeeContent, index);
	} else if (forceContentVersion === 'mobile' && mobileContent) {
		processMatches(tokens.desktop, mobileContent, index);
	} else {
		processMatches(tokens.desktop, desktopContent, index);
		if (mobileContent?.length) {
			tokens.mobile = [];
			processMatches(tokens.mobile, mobileContent, index);
		}
	}

	const query = locals.user?.hasPosOptions
		? { 'actionSettings.retail.visible': true }
		: { 'actionSettings.eShop.visible': true };
	const leaderboards =
		leaderboardSlugs.size > 0
			? await collections.leaderboards
					.find({
						_id: { $in: [...leaderboardSlugs] }
					})
					.project<Pick<Leaderboard, '_id' | 'name' | 'progress' | 'endsAt' | 'mode' | 'beginsAt'>>(
						{
							name: 1,
							goal: 1,
							progress: 1,
							endsAt: 1,
							beginsAt: 1,
							mode: 1
						}
					)
					.toArray()
			: [];
	const allProductsLead = leaderboards
		.flatMap((leaderboard) => leaderboard.progress || [])
		.map((progressItem) => progressItem.productId);

	const externalProducts: ExternalProductData[] =
		externalProductUrls.size > 0
			? (await Promise.all([...externalProductUrls].map(fetchExternalProduct))).filter(
					(p): p is ExternalProductData => p !== null
			  )
			: [];

	const [
		products,
		challenges,
		sliders,
		tags,
		specifications,
		contactForms,
		countdowns,
		galleries,
		schedules
	] = await Promise.all([
		tagProductsSlugs.size > 0 || productSlugs.size > 0 || allProductsLead.length > 0
			? collections.products
					.find({
						$or: [
							{ tagIds: { $in: [...tagProductsSlugs] } },
							{ _id: { $in: [...productSlugs, ...allProductsLead] } }
						],
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
							| 'stock'
							| 'tagIds'
							| 'alias'
							| 'isTicket'
							| 'hasSellDisclaimer'
							| 'payWhatYouWant'
							| 'bookingSpec'
							| 'hasVariations'
						>
					>({
						price: 1,
						shortDescription: locals.language
							? {
									$ifNull: [
										`$translations.${locals.language}.shortDescription`,
										'$shortDescription'
									]
							  }
							: 1,
						preorder: 1,
						name: locals.language
							? { $ifNull: [`$translations.${locals.language}.name`, '$name'] }
							: 1,
						availableDate: 1,
						type: 1,
						shipping: 1,
						actionSettings: 1,
						stock: 1,
						tagIds: 1,
						alias: 1,
						isTicket: 1,
						hasSellDisclaimer: 1,
						payWhatYouWant: 1,
						bookingSpec: 1,
						hasVariations: 1
					})
					.toArray()
			: [],
		challengeSlugs.size > 0
			? collections.challenges
					.find({
						_id: { $in: [...challengeSlugs] }
					})
					.project<
						Pick<Challenge, '_id' | 'name' | 'goal' | 'progress' | 'endsAt' | 'mode' | 'beginsAt'>
					>({
						name: locals.language
							? { $ifNull: [`$translations.${locals.language}.name`, '$name'] }
							: 1,
						goal: 1,
						progress: 1,
						endsAt: 1,
						beginsAt: 1,
						mode: 1
					})
					.toArray()
			: [],
		sliderSlugs.size > 0
			? collections.sliders
					.find({
						_id: { $in: [...sliderSlugs] }
					})
					.toArray()
			: [],

		tagSlugs.size > 0
			? collections.tags
					.find({
						_id: { $in: [...tagSlugs] }
					})
					.project<
						Pick<Tag, '_id' | 'name' | 'title' | 'subtitle' | 'content' | 'shortContent' | 'cta'>
					>({
						name: 1,
						title: { $ifNull: [`$translations.${locals.language}.title`, '$title'] },
						subtitle: { $ifNull: [`$translations.${locals.language}.subtitle`, '$subtitle'] },
						content: { $ifNull: [`$translations.${locals.language}.content`, '$content'] },
						shortContent: {
							$ifNull: [`$translations.${locals.language}.shortContent`, '$shortContent']
						},
						cta: { $ifNull: [`$translations.${locals.language}.cta`, '$cta'] }
					})
					.toArray()
			: [],
		specificationSlugs.size > 0
			? collections.specifications
					.find({
						_id: { $in: [...specificationSlugs] }
					})
					.project<Pick<Specification, '_id' | 'content' | 'title'>>({
						title: { $ifNull: [`$translations.${locals.language}.title`, '$title'] },
						content: { $ifNull: [`$translations.${locals.language}.content`, '$content'] }
					})
					.toArray()
			: [],
		contactFormSlugs.size > 0
			? collections.contactForms
					.find({
						_id: { $in: [...contactFormSlugs] }
					})
					.project<
						Pick<
							ContactForm,
							| '_id'
							| 'content'
							| 'target'
							| 'subject'
							| 'displayFromField'
							| 'prefillWithSession'
							| 'disclaimer'
						>
					>({
						content: { $ifNull: [`$translations.${locals.language}.content`, '$content'] },
						target: 1,
						displayFromField: 1,
						prefillWithSession: 1,
						subject: { $ifNull: [`$translations.${locals.language}.subject`, '$subject'] },
						disclaimer: { $ifNull: [`$translations.${locals.language}.disclaimer`, '$disclaimer'] }
					})
					.toArray()
			: [],
		countdownFormSlugs.size > 0
			? collections.countdowns
					.find({
						_id: { $in: [...countdownFormSlugs] }
					})
					.project<Pick<Countdown, '_id' | 'title' | 'description' | 'endsAt'>>({
						title: {
							$ifNull: [`$translations.${locals.language}.title`, '$title']
						},
						description: {
							$ifNull: [`$translations.${locals.language}.description`, '$description']
						},
						endsAt: 1
					})
					.toArray()
			: [],
		gallerySlugs.size > 0
			? collections.galleries
					.find({
						_id: { $in: [...gallerySlugs] }
					})
					.project<Pick<Gallery, '_id' | 'name' | 'principal' | 'secondary'>>({
						name: 1,
						principal: { $ifNull: [`$translations.${locals.language}.principal`, '$principal'] },
						secondary: { $ifNull: [`$translations.${locals.language}.secondary`, '$secondary'] }
					})
					.toArray()
			: [],
		scheduleSlugs.size > 0
			? collections.schedules
					.find({
						_id: { $in: [...scheduleSlugs] }
					})
					.toArray()
			: []
	]);

	const pictureConditions = {
		$or: [
			...(sliderSlugs.size ? [{ 'slider._id': { $in: [...sliderSlugs] } }] : []),
			...(tagSlugs.size ? [{ 'tag._id': { $in: [...tagSlugs] } }] : []),
			...(products.length ? [{ productId: { $in: [...products.map((prod) => prod._id)] } }] : []),
			...(gallerySlugs.size ? [{ galleryId: { $in: [...gallerySlugs] } }] : []),
			...(scheduleSlugs.size ? [{ 'schedule._id': { $in: [...scheduleSlugs] } }] : []),
			...(pictureSlugs.size ? [{ _id: { $in: [...pictureSlugs] } }] : [])
		]
	};

	const [digitalFiles, pictures, scheduleEvents] = await Promise.all([
		products.length > 0
			? collections.digitalFiles
					.find({ productId: { $in: products.map((product) => product._id) } })
					.project<Pick<DigitalFile, '_id' | 'name' | 'productId'>>({
						name: 1,
						productId: 1
					})
					.sort({ createdAt: 1 })
					.toArray()
			: Promise.resolve([]),
		pictureConditions.$or.length
			? collections.pictures.find(pictureConditions).sort({ order: 1, createdAt: 1 }).toArray()
			: Promise.resolve([]),
		scheduleSlugs.size
			? collections.scheduleEvents
					.find({
						scheduleId: { $in: [...scheduleSlugs] },
						...(schedules.every((schedule) => !schedule.displayPastEvents)
							? {
									endsAt: {
										$gt: subMinutes(new Date(), Math.max(...schedules.map((s) => s.pastEventDelay)))
									}
							  }
							: {})
					})
					.project<Omit<ScheduleEventBooked, '_id' | 'orderId'>>({
						_id: 0,
						orderId: 0
					})
					.toArray()
			: Promise.resolve([])
	]);

	const scheduleEventsById = groupBy(scheduleEvents, (event) => event.scheduleId);

	return {
		tokens,
		challenges,
		sliders,
		products,
		externalProducts,
		tags,
		specifications,
		contactForms,
		countdowns,
		galleries,
		leaderboards,
		schedules: schedules.map((schedule) => ({
			...schedule,
			events: [...schedule.events, ...(scheduleEventsById[schedule._id] ?? [])].filter((event) =>
				!schedule.displayPastEvents
					? (event.endsAt ?? Infinity) > subMinutes(new Date(), schedule.pastEventDelay ?? 0)
					: true
			)
		})),
		pictures,
		digitalFiles,
		hasPosOptions: locals.user?.hasPosOptions
	};
}

export type CmsTokens = Awaited<ReturnType<typeof cmsFromContent>>['tokens'];
export type CmsProduct = Awaited<ReturnType<typeof cmsFromContent>>['products'][number];
export type CmsChallenge = Awaited<ReturnType<typeof cmsFromContent>>['challenges'][number];
export type CmsSlider = Awaited<ReturnType<typeof cmsFromContent>>['sliders'][number];
export type CmsTag = Awaited<ReturnType<typeof cmsFromContent>>['tags'][number];
export type CmsPicture = Awaited<ReturnType<typeof cmsFromContent>>['pictures'][number];
export type CmsDigitalFile = Awaited<ReturnType<typeof cmsFromContent>>['digitalFiles'][number];
export type CmsSpecification = Awaited<ReturnType<typeof cmsFromContent>>['specifications'][number];
export type CmsContactForm = Awaited<ReturnType<typeof cmsFromContent>>['contactForms'][number];
export type CmsCountdown = Awaited<ReturnType<typeof cmsFromContent>>['countdowns'][number];
export type CmsGallery = Awaited<ReturnType<typeof cmsFromContent>>['galleries'][number];
export type CmsToken = Awaited<ReturnType<typeof cmsFromContent>>['tokens']['desktop'][number];
export type CmsLeaderboard = Awaited<ReturnType<typeof cmsFromContent>>['leaderboards'][number];
export type CmsSchedule = Awaited<ReturnType<typeof cmsFromContent>>['schedules'][number];
