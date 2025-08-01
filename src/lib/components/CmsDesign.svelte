<script lang="ts">
	import ChallengeWidget from './ChallengeWidget.svelte';
	import CarouselWidget from './CarouselWidget.svelte';
	import PictureComponent from './Picture.svelte';
	import type { Picture } from '$lib/types/Picture';
	import ProductWidget from './ProductWidget.svelte';
	import type { SetRequired } from 'type-fest';
	import TagWidget from './TagWidget.svelte';
	import type {
		CmsChallenge,
		CmsDigitalFile,
		CmsPicture,
		CmsProduct,
		CmsSlider,
		CmsSpecification,
		CmsTag,
		CmsTokens,
		CmsContactForm,
		CmsCountdown,
		CmsGallery,
		CmsLeaderboard,
		CmsSchedule
	} from '$lib/server/cms';
	import SpecificationWidget from './SpecificationWidget.svelte';
	import ContactForm from './ContactForm.svelte';
	import { mapKeys } from '$lib/utils/mapKeys';
	import CountdownWidget from './CountdownWidget.svelte';
	import GalleryWidget from './GalleryWidget/GalleryWidget.svelte';
	import { page } from '$app/stores';
	import LeaderBoardWidget from './LeaderBoardWidget.svelte';
	import CurrencyCalculator from './CurrencyCalculator.svelte';
	import ScheduleWidget from './ScheduleWidget.svelte';
	import { groupBy } from '$lib/utils/group-by';
	import { get } from '$lib/utils/get';

	export let products: CmsProduct[];
	export let pictures: CmsPicture[];
	export let challenges: CmsChallenge[];
	export let tokens: CmsTokens;
	export let sliders: CmsSlider[];
	export let digitalFiles: CmsDigitalFile[];
	export let hasPosOptions: boolean | undefined;
	export let sessionEmail: string | undefined;
	export let tags: CmsTag[];
	export let specifications: CmsSpecification[];
	export let contactForms: CmsContactForm[];
	export let countdowns: CmsCountdown[];
	export let pageName: string | undefined;
	export let websiteLink: string | undefined;
	export let brandName: string | undefined;
	export let galleries: CmsGallery[];
	export let leaderboards: CmsLeaderboard[];
	export let schedules: CmsSchedule[];

	let classNames = '';
	export { classNames as class };

	const lowerVars = mapKeys(
		{
			pageLink: $page.url.toString(),
			pageName: pageName,
			websiteLink: websiteLink,
			brandName: brandName
		},
		(key) => key.toLowerCase()
	);

	$: productById = Object.fromEntries(products.map((product) => [product._id, product]));
	$: digitalFilesByProduct = Object.fromEntries(
		digitalFiles.map((digitalFile) => [digitalFile.productId, digitalFile])
	);
	$: challengeById = Object.fromEntries(challenges.map((challenge) => [challenge._id, challenge]));
	$: leaderboardById = Object.fromEntries(
		leaderboards.map((leaderboard) => [leaderboard._id, leaderboard])
	);

	$: sliderById = Object.fromEntries(sliders.map((slider) => [slider._id, slider]));
	$: tagById = Object.fromEntries(tags.map((tag) => [tag._id, tag]));
	$: scheduleById = Object.fromEntries(schedules.map((schedule) => [schedule._id, schedule]));

	$: picturesByTag = groupBy(
		pictures.filter((picture): picture is SetRequired<Picture, 'tag'> => !!picture.tag),
		(p) => p.tag._id
	);
	$: picturesBySlider = groupBy(
		pictures.filter((picture): picture is SetRequired<Picture, 'slider'> => !!picture.slider),
		(p) => p.slider._id
	);
	$: picturesByProduct = groupBy(
		pictures.filter((picture): picture is SetRequired<Picture, 'productId'> => !!picture.productId),
		(p) => p.productId
	);
	$: picturesBySchedule = groupBy(
		pictures.filter((picture): picture is SetRequired<Picture, 'schedule'> => !!picture.schedule),
		(p) => p.schedule._id
	);
	$: picturesByGallery = groupBy(
		pictures.filter((picture): picture is SetRequired<Picture, 'galleryId'> => !!picture.galleryId),
		(p) => p.galleryId
	);
	$: pictureById = Object.fromEntries(pictures.map((picture) => [picture._id, picture]));
	$: specificationById = Object.fromEntries(
		specifications.map((specification) => [specification._id, specification])
	);
	$: contactFormById = Object.fromEntries(
		contactForms.map((contactForm) => [
			contactForm._id,
			{
				...contactForm,
				subject: contactForm.subject.replace(/{{([^}]+)}}/g, (match, p1) => {
					return lowerVars[p1.toLowerCase()] || match;
				}),
				content: contactForm.content.replace(/{{([^}]+)}}/g, (match, p1) => {
					return lowerVars[p1.toLowerCase()] || match;
				})
			}
		])
	);
	$: countdownById = Object.fromEntries(countdowns.map((countdown) => [countdown._id, countdown]));

	function productsByTag(
		searchTag: string,
		by: string | undefined = undefined,
		sort: 'asc' | 'desc' = 'asc'
	) {
		const filteredProducts = products.filter((product) => product.tagIds?.includes(searchTag));

		const sortedProducts = filteredProducts.sort((a, b) => {
			if (by) {
				const aValueBy = get(a, by as keyof typeof a);
				const bValueBy = get(b, by as keyof typeof b);
				if (aValueBy !== bValueBy) {
					return (aValueBy ?? '') < (bValueBy ?? '') ? -1 : 1;
				}
			}
			const aValue = a.alias[1] ?? a.alias[0];
			const bValue = b.alias[1] ?? b.alias[0];

			return aValue.localeCompare(bValue);
		});

		return sort === 'asc' ? sortedProducts : sortedProducts.reverse();
	}
	$: galleryById = Object.fromEntries(galleries.map((gallery) => [gallery._id, gallery]));
</script>

<div class={tokens.mobile ? 'hidden lg:contents' : 'contents'}>
	<div class="prose max-w-full {classNames}">
		{#each tokens.desktop as token}
			{#if token.type === 'productWidget' && productById[token.slug]}
				<ProductWidget
					product={productById[token.slug]}
					pictures={picturesByProduct[token.slug] ?? []}
					hasDigitalFiles={digitalFilesByProduct[token.slug] !== null}
					displayOption={token.display}
					canBuy={hasPosOptions
						? productById[token.slug].actionSettings.retail.canBeAddedToBasket
						: productById[token.slug].actionSettings.eShop.canBeAddedToBasket}
					class="not-prose my-5"
				/>
			{:else if token.type === 'tagProducts' && productsByTag(token.slug)}
				{#each productsByTag(token.slug, token.by ?? '', token.sort) as product}
					<ProductWidget
						{product}
						pictures={picturesByProduct[product._id] ?? []}
						hasDigitalFiles={digitalFilesByProduct[product._id] !== null}
						canBuy={hasPosOptions
							? product.actionSettings.retail.canBeAddedToBasket
							: product.actionSettings.eShop.canBeAddedToBasket}
						class="not-prose my-5"
						displayOption={token.display}
					/>
				{/each}
			{:else if token.type === 'challengeWidget' && challengeById[token.slug]}
				<ChallengeWidget challenge={challengeById[token.slug]} class="not-prose my-5" />
			{:else if token.type === 'sliderWidget' && sliderById[token.slug]}
				<CarouselWidget
					autoplay={token.autoplay ? token.autoplay : 3000}
					pictures={picturesBySlider[token.slug] ?? []}
					class="not-prose mx-auto my-5"
				/>
			{:else if token.type === 'tagWidget' && tagById[token.slug]}
				<TagWidget
					tag={tagById[token.slug]}
					pictures={picturesByTag[token.slug] ?? []}
					displayOption={token.display}
					titleCase={token.titleCase}
					class="not-prose my-5"
				/>
			{:else if token.type === 'specificationWidget' && specificationById[token.slug]}
				<SpecificationWidget specification={specificationById[token.slug]} class="not-prose my-5" />
			{:else if token.type === 'contactFormWidget' && contactFormById[token.slug]}
				<ContactForm
					contactForm={contactFormById[token.slug]}
					{sessionEmail}
					class="not-prose my-5"
				/>
			{:else if token.type === 'countdownWidget' && countdownById[token.slug]}
				<CountdownWidget countdown={countdownById[token.slug]} class="not-prose my-5" />
			{:else if token.type === 'galleryWidget' && galleryById[token.slug]}
				<GalleryWidget
					gallery={galleryById[token.slug]}
					pictures={picturesByGallery[token.slug] ?? []}
					displayOption={token.display}
					class="not-prose my-5"
				/>
			{:else if token.type === 'pictureWidget'}
				<PictureComponent
					picture={pictureById[token.slug]}
					class="my-5 lg:block hidden {token.height ? `h-[${token.height}px]` : ''} {token.width
						? `w-[${token.width}px]`
						: ''} {token.position === 'center'
						? 'mx-auto'
						: token.position === 'right'
						? 'ml-auto'
						: token.position === 'full-width'
						? 'w-full max-w-none'
						: ''}"
					style="{token.fit ? `object-fit: ${token.fit};` : ''}{token.width
						? `width: ${token.width}px;`
						: ''}{token.height ? `height: ${token.height}px;` : ''}"
				/>
				{#if token.msubstitute}
					<PictureComponent picture={pictureById[token.msubstitute]} class="my-5 lg:hidden block" />
				{:else}
					<PictureComponent picture={pictureById[token.slug]} class="my-5 lg:hidden block" />
				{/if}
			{:else if token.type === 'leaderboardWidget'}
				<LeaderBoardWidget
					leaderboard={leaderboardById[token.slug]}
					{pictures}
					{products}
					class="not-prose"
				/>
			{:else if token.type === 'qrCode'}
				{#if token.slug === 'Bolt12'}
					<a href="lightning:{$page.data.bolt12Address}">
						<img src="{$page.url.origin}/phoenixd/bolt12/qrcode" class="w-96 h-96" alt="QR code" />
					</a>
				{/if}
			{:else if token.type === 'currencyCalculatorWidget'}
				<CurrencyCalculator />
			{:else if token.type === 'scheduleWidget' && scheduleById[token.slug]}
				<ScheduleWidget
					schedule={scheduleById[token.slug]}
					pictures={picturesBySchedule[token.slug] ?? []}
					displayOption={token.display}
					class="not-prose my-5"
				/>
			{:else if token.type === 'html'}
				<div class="my-5">
					<!-- eslint-disable svelte/no-at-html-tags -->
					{@html token.raw}
				</div>
			{/if}
		{/each}
	</div>
</div>
{#if tokens.mobile}
	<div class="contents lg:hidden">
		<div class="prose max-w-full {classNames}">
			{#each tokens.mobile as token}
				{#if token.type === 'productWidget' && productById[token.slug]}
					<ProductWidget
						product={productById[token.slug]}
						pictures={picturesByProduct[token.slug] ?? []}
						hasDigitalFiles={digitalFilesByProduct[token.slug] !== null}
						displayOption={token.display}
						canBuy={hasPosOptions
							? productById[token.slug].actionSettings.retail.canBeAddedToBasket
							: productById[token.slug].actionSettings.eShop.canBeAddedToBasket}
						class="not-prose my-5"
					/>
				{:else if token.type === 'tagProducts' && productsByTag(token.slug)}
					{#each productsByTag(token.slug) as product}
						<ProductWidget
							{product}
							pictures={picturesByProduct[product._id] ?? []}
							hasDigitalFiles={digitalFilesByProduct[product._id] !== null}
							canBuy={hasPosOptions
								? product.actionSettings.retail.canBeAddedToBasket
								: product.actionSettings.eShop.canBeAddedToBasket}
							class="not-prose my-5"
							displayOption={token.display}
						/>
					{/each}
				{:else if token.type === 'challengeWidget' && challengeById[token.slug]}
					<ChallengeWidget challenge={challengeById[token.slug]} class="not-prose my-5" />
				{:else if token.type === 'sliderWidget' && sliderById[token.slug]}
					<CarouselWidget
						autoplay={token.autoplay ? token.autoplay : 3000}
						pictures={picturesBySlider[token.slug] ?? []}
						class="not-prose mx-auto my-5"
					/>
				{:else if token.type === 'tagWidget' && tagById[token.slug]}
					<TagWidget
						tag={tagById[token.slug]}
						pictures={picturesByTag[token.slug] ?? []}
						displayOption={token.display}
						class="not-prose my-5"
					/>
				{:else if token.type === 'specificationWidget' && specificationById[token.slug]}
					<SpecificationWidget
						specification={specificationById[token.slug]}
						class="not-prose my-5"
					/>
				{:else if token.type === 'contactFormWidget' && contactFormById[token.slug]}
					<ContactForm
						contactForm={contactFormById[token.slug]}
						{sessionEmail}
						class="not-prose my-5"
					/>
				{:else if token.type === 'countdownWidget' && countdownById[token.slug]}
					<CountdownWidget countdown={countdownById[token.slug]} class="not-prose my-5" />
				{:else if token.type === 'galleryWidget' && galleryById[token.slug]}
					<GalleryWidget
						gallery={galleryById[token.slug]}
						pictures={picturesByGallery[token.slug] ?? []}
						displayOption={token.display}
						class="not-prose my-5"
					/>
				{:else if token.type === 'pictureWidget'}
					<PictureComponent picture={pictureById[token.slug]} class="my-5" />
				{:else if token.type === 'leaderboardWidget'}
					<LeaderBoardWidget
						leaderboard={leaderboardById[token.slug]}
						{pictures}
						{products}
						class="not-prose"
					/>
				{:else if token.type === 'qrCode'}
					{#if token.slug === 'Bolt12'}
						<a href="lightning:{$page.data.bolt12Address}">
							<img
								src="{$page.url.origin}/phoenixd/bolt12/qrcode"
								class="w-96 h-96"
								alt="QR code"
							/>
						</a>
					{/if}
				{:else if token.type === 'currencyCalculatorWidget'}
					<CurrencyCalculator />
				{:else if token.type === 'scheduleWidget' && scheduleById[token.slug]}
					<ScheduleWidget
						schedule={scheduleById[token.slug]}
						pictures={picturesBySchedule[token.slug] ?? []}
						displayOption={token.display}
						class="not-prose my-5"
					/>
				{:else if token.type === 'html'}
					<div class="my-5">
						<!-- eslint-disable svelte/no-at-html-tags -->
						{@html token.raw}
					</div>
				{/if}
			{/each}
		</div>
	</div>
{/if}
