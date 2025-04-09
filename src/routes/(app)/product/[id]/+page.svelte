<script lang="ts">
	import { page } from '$app/stores';
	import { marked } from 'marked';
	import Picture from '$lib/components/Picture.svelte';
	import PriceTag from '$lib/components/PriceTag.svelte';
	import { applyAction, enhance } from '$app/forms';
	import IconInfo from '$lib/components/icons/IconInfo.svelte';
	import { productAddedToCart } from '$lib/stores/productAddedToCart';
	import { invalidate } from '$app/navigation';
	import { UrlDependency } from '$lib/types/UrlDependency';
	import {
		DEFAULT_MAX_QUANTITY_PER_ORDER,
		isPreorder as isPreorderFn,
		oneMaxPerLine,
		productPriceWithVariations
	} from '$lib/types/Product';
	import { toCurrency } from '$lib/utils/toCurrency';
	import { formatDistance } from 'date-fns';
	import { POS_ROLE_ID } from '$lib/types/User';
	import { useI18n } from '$lib/i18n';
	import CmsDesign from '$lib/components/CmsDesign.svelte';
	import { FRACTION_DIGITS_PER_CURRENCY, CURRENCY_UNIT } from '$lib/types/Currency.js';
	import { serializeSchema } from '$lib/utils/jsonLd.js';
	import type { Product as SchemaOrgProduct, WithContext } from 'schema-dts';

	export let data;

	let quantity = 1;
	let loading = false;
	let errorMessage = '';
	let currentTime = Date.now();
	const { t, locale, formatDistanceLocale } = useI18n();

	$: timeDifference =
		data.discount?.endsAt &&
		formatDistance(currentTime, data.discount.endsAt, {
			addSuffix: false,
			includeSeconds: true,
			locale: formatDistanceLocale()
		});
	let deposit = 'partial';

	const PWYWCurrency =
		data.currencies.main === 'BTC' &&
		toCurrency('BTC', data.product.price.amount, data.product.price.currency) < 0.01
			? 'SAT'
			: data.currencies.main;
	const PWYWMinimum = toCurrency(
		PWYWCurrency,
		data.product.price.amount,
		data.product.price.currency
	);
	const PWYWRecommended = data.product.recommendedPWYWAmount
		? toCurrency(PWYWCurrency, data.product.recommendedPWYWAmount, data.product.price.currency)
		: 0;
	const PWYWMaximum = data.product.maximumPrice
		? toCurrency(PWYWCurrency, data.product.maximumPrice.amount, data.product.maximumPrice.currency)
		: Infinity;
	let customAmount = Math.max(PWYWRecommended, PWYWMinimum);

	$: currentPicture =
		data.pictures.find((picture) => picture._id === $page.url.searchParams.get('picture')) ??
		data.pictures[0];

	$: isPreorder = isPreorderFn(data.product.availableDate, data.product.preorder);

	$: amountAvailable = Math.max(
		Math.min(
			data.product.stock?.available ?? Infinity,
			data.product.maxQuantityPerOrder || DEFAULT_MAX_QUANTITY_PER_ORDER
		),
		0
	);

	$: canBuy =
		data.roleId === POS_ROLE_ID
			? data.product.actionSettings.retail.canBeAddedToBasket
			: data.product.actionSettings.eShop.canBeAddedToBasket;
	function addToCart() {
		$productAddedToCart = {
			product: data.product,
			quantity,
			...(data.product.type !== 'subscription' && {
				customPrice: {
					amount: customAmount,
					currency: data.product.hasVariations ? data.product.price.currency : PWYWCurrency
				}
			}),
			picture: currentPicture,
			depositPercentage:
				deposit === 'partial' && data.product.deposit ? data.product.deposit.percentage : undefined,
			...(data.product.hasVariations && {
				chosenVariations: selectedVariations
			})
		};
	}

	let PWYWInput: HTMLInputElement | null = null;
	let acceptRestriction = data.product.hasSellDisclaimer ? false : true;
	function checkPWYW() {
		if (!PWYWInput) {
			return true;
		}
		if (customAmount > 0 && customAmount < CURRENCY_UNIT[PWYWCurrency]) {
			PWYWInput.setCustomValidity(
				t('product.minimumForCurrency', {
					currency: PWYWCurrency,
					minimum: CURRENCY_UNIT[PWYWCurrency].toLocaleString($locale, {
						maximumFractionDigits: FRACTION_DIGITS_PER_CURRENCY[PWYWCurrency]
					})
				})
			);
			PWYWInput.reportValidity();

			return false;
		}

		PWYWInput.setCustomValidity('');

		return true;
	}
	const schema: WithContext<SchemaOrgProduct> = {
		'@context': `https://schema.org`,
		'@type': 'Product',
		name: data.product.name,
		image: `${$page.url.origin}/picture/raw/${data.pictures[0]._id}/format/${
			data.pictures[0].storage.formats.find((image) => image.width >= 500 && image.height >= 500)
				?.width ?? data.pictures[0].storage.formats[0].width
		}`,
		description: data.product.description,
		offers: {
			'@type': 'Offer',
			price: data.product.price.amount,
			priceCurrency: data.product.price.currency
		}
	};

	let isZoomed = false;
	function handleClick() {
		isZoomed = !isZoomed;
	}

	let selectedVariations: Record<string, string> = {};
	$: if (data.product.hasVariations) {
		customAmount = productPriceWithVariations(data.product, selectedVariations);
	}
</script>

<svelte:head>
	<title>{data.product.name}</title>
	{#if data.product.shortDescription}
		<meta property="og:description" content={data.product.shortDescription} />
	{/if}
	<meta property="og:url" content="{$page.url.origin}{$page.url.pathname}" />
	<meta property="og:type" content="og:product" />
	<meta property="og:title" content={data.product.name} />
	{#if currentPicture}
		<meta
			property="og:image"
			content="{$page.url.origin}/picture/raw/{currentPicture._id}/format/{currentPicture.storage
				.formats[0].width}"
		/>
	{/if}
	<meta property="product:price:amount" content={String(data.product.price.amount)} />
	<meta property="product:price:currency" content={data.product.price.currency} />
	<meta property="og:type" content="og:product" />
	{#if data.product.actionSettings.googleShopping.visible}
		<!-- eslint-disable svelte/no-at-html-tags -->
		{@html serializeSchema(schema)}
	{/if}
	{#if data.product.hideFromSEO}
		<meta name="robots" content="noindex" />
	{/if}
</svelte:head>

<main class="mx-auto max-w-7xl py-10 px-6">
	{#if data.productCMSBefore}
		<CmsDesign
			challenges={data.productCMSBefore.challenges}
			tokens={data.productCMSBefore.tokens}
			sliders={data.productCMSBefore.sliders}
			products={data.productCMSBefore.products}
			pictures={data.productCMSBefore.pictures}
			tags={data.productCMSBefore.tags}
			digitalFiles={data.productCMSBefore.digitalFiles}
			roleId={data.roleId ? data.roleId : ''}
			specifications={data.productCMSBefore.specifications}
			contactForms={data.productCMSBefore?.contactForms}
			pageName={data.product.name}
			websiteLink={data.websiteLink}
			brandName={data.brandName}
			sessionEmail={data.email}
			countdowns={data.productCMSBefore.countdowns}
			galleries={data.productCMSBefore.galleries}
			leaderboards={data.productCMSBefore.leaderboards}
			schedules={data.productCMSBefore.schedules}
			class={data.product.mobile?.hideContentBefore || data.hideCmsZonesOnMobile
				? 'hidden lg:contents'
				: ''}
		/>
	{/if}

	<div class="flex flex-row my-12">
		<div class="w-14 min-w-[48px] py-14 hidden lg:block">
			{#if data.pictures.length > 1}
				{#each data.pictures as picture, i}
					<a
						href={i === 0 ? $page.url.pathname : '?picture=' + picture._id}
						data-sveltekit-noscroll
					>
						<Picture
							{picture}
							class="h-12 w-12 rounded-sm my-2 object-cover {picture === currentPicture
								? 'ring-2 ring-link ring-offset-2'
								: ''} cursor-pointer"
						/>
					</a>
				{/each}
			{/if}
		</div>

		<div class="flex flex-col lg:grid lg:grid-cols-[70%_1fr] gap-2 grow pb-12">
			<div class="flex flex-col gap-4">
				<!-- add product name -->
				<h1 class="text-4xl body-title">{data.product.name}</h1>
				<!-- Getting this right with rounded borders on both chrome & FF is painful, chrome NEEDs overflow-hidden -->
				<div
					class="aspect-video w-full lg:hover:overflow-visible {isZoomed
						? 'overflow-visible'
						: 'overflow-hidden'} overflow-hidden px-4 group"
				>
					<Picture
						picture={currentPicture}
						on:click={handleClick}
						class="mx-auto rounded h-full object-contain transition duration-500 transform lg:group-hover:scale-150 {isZoomed
							? 'lg:scale-100 scale-150'
							: ''}"
						sizes="(min-width: 1280px) 896px, 70vw"
					/>
				</div>
				{#if data.pictures.length > 1}
					<div class="flex flex-row min-w-[96px] sm:inline lg:hidden py-12">
						{#each data.pictures as picture, i}
							<a href={i === 0 ? $page.url.pathname : '?picture=' + picture._id}>
								<Picture
									{picture}
									class="h-12 w-12 rounded-sm object-cover {picture === currentPicture
										? 'ring-2 ring-link ring-offset-2'
										: ''} cursor-pointer"
								/>
							</a>
						{/each}
					</div>
				{/if}

				{#if data.product.description.trim() || data.product.shortDescription.trim()}
					<hr class="border-gray-300" />
					<h2 class="text-[22px]">
						{data.product.displayShortDescription && data.product.shortDescription
							? data.product.shortDescription
							: 'Description'}
					</h2>
					<p class="prose body-secondaryText lg:contents hidden">
						<!-- eslint-disable svelte/no-at-html-tags -->
						{@html marked(data.product.description.replaceAll('<', '&lt;'))}
					</p>
				{/if}
			</div>
			<div
				class="flex flex-col gap-2 border-gray-300 lg:border-l lg:border-b lg:rounded lg:pl-4 lg:pb-4 h-fit overflow-hidden"
			>
				<hr class="border-gray-300 lg:hidden mt-4 pb-2" />
				<div class="flex gap-2 lg:flex-col lg:items-start items-center justify-between">
					<PriceTag
						currency={data.product.price.currency}
						class="text-2xl lg:text-4xl truncate max-w-full"
						short={false}
						amount={data.product.hasVariations ? customAmount : data.product.price.amount}
						main
					/>
					<PriceTag
						currency={data.product.price.currency}
						amount={data.product.hasVariations ? customAmount : data.product.price.amount}
						secondary
						class="text-xl"
					/>
					<span class="font-semibold">{t('product.vatExcluded')}</span>
				</div>

				{#if data.discount}
					<hr class="border-gray-300" />
					<h3 class="text-[22px]">
						{#if timeDifference === undefined}
							{t('product.discountBannerNoTime', {
								discountPercent: data.discount.percentage
							})}
						{:else}
							{t('product.discountBanner', {
								discountPercent: data.discount.percentage,
								timespan: timeDifference
							})}
						{/if}
					</h3>

					{#if data.discount.percentage === 100 && 0}
						<hr class="border-gray-300" />
						<div class="border border-[#F1DA63] bg-[#FFFBD5] p-2 rounded text-base flex gap-2">
							<IconInfo class="text-[#E4C315]" />
							<div>
								<h3 class="font-semibold">{t('product.freeWithTitle')}</h3>
								<p>
									{t('product.freeWithSub')}
								</p>
								<a href="/cabinet" class="text-[#E4C315] hover:underline"
									>{t('product.seeInCabinet')}</a
								>
							</div>
						</div>
					{/if}
				{/if}
				<hr class="border-gray-300 my-2" />

				{#if isPreorder && data.product.availableDate}
					{#if data.product.customPreorderText}
						<p>
							{data.product.customPreorderText}
						</p>
					{:else}
						<p>
							{t('product.preorderText', {
								date: new Date(data.product.availableDate).toLocaleDateString($locale, {
									year: 'numeric',
									month: 'long',
									day: 'numeric'
								})
							})}
						</p>
					{/if}
				{/if}
				{#if !data.product.availableDate || data.product.availableDate <= new Date() || isPreorder}
					{@const verb = isPreorder
						? 'preorder'
						: data.product.type === 'donation'
						? 'donate'
						: data.product.type === 'subscription'
						? 'subscribe'
						: 'buy'}
					<form
						action="?/buy"
						method="post"
						use:enhance={({ action, cancel }) => {
							if (!checkPWYW()) {
								cancel();
								return;
							}
							loading = true;
							errorMessage = '';
							return async ({ result }) => {
								loading = false;

								if (result.type === 'error') {
									errorMessage = result.error.message;
									return;
								}

								if (!action.searchParams.has('/addToCart')) {
									return await applyAction(result);
								}

								await invalidate(UrlDependency.Cart);
								addToCart();
								document.body.scrollIntoView();
							};
						}}
						class="flex flex-col gap-2"
					>
						{#if canBuy}
							{#if data.product.payWhatYouWant}
								<hr class="border-gray-300 lg:hidden mt-4 pb-2" />
								<input type="hidden" name="customPriceCurrency" value={PWYWCurrency} />
								<div class="flex flex-col gap-2 justify-between">
									<label class="w-full form-label">
										{t('product.nameYourPrice', { currency: PWYWCurrency })}
										<input
											class="form-input"
											type="number"
											min={PWYWMinimum}
											max={PWYWMaximum}
											name="customPriceAmount"
											bind:value={customAmount}
											bind:this={PWYWInput}
											on:input={checkPWYW}
											placeholder={t('product.pricePlaceholder')}
											required
											step="any"
										/>
									</label>
								</div>
							{/if}
							{#if data.product.standalone && data.product.hasVariations && data.product.variationLabels}
								{#each Object.keys(data.product.variationLabels.values) as key}
									<label class="mb-2" for={key}>{data.product.variationLabels.names[key]}</label>
									<select
										bind:value={selectedVariations[key]}
										id={key}
										name="chosenVariations[{key}]"
										class="form-input w-full inline cursor-pointer"
									>
										{#each Object.entries(data.product.variationLabels.values[key]) as [valueKey, valueLabel]}
											<option value={valueKey}>{valueLabel}</option>
										{/each}
									</select>
								{/each}
							{/if}
							{#if !oneMaxPerLine(data.product) && amountAvailable > 0}
								<label class="mb-2">
									{t('cart.quantity')}:
									<select
										name="quantity"
										bind:value={quantity}
										class="form-input w-16 ml-2 inline cursor-pointer"
									>
										{#each Array(amountAvailable)
											.fill(0)
											.map((_, i) => i + 1) as i}
											<option value={i}>{i}</option>
										{/each}
									</select>
								</label>
							{/if}
							{#if data.product.deposit}
								<label class="checkbox-label">
									<input type="radio" value="partial" name="deposit" checked bind:group={deposit} />
									{t('product.deposit.payPercentage', {
										percentage: (data.product.deposit.percentage / 100).toLocaleString('es-sv', {
											style: 'percent'
										})
									})}: <PriceTag
										main
										amount={(data.product.price.amount * data.product.deposit.percentage) / 100}
										currency={data.product.price.currency}
										inline
									/>
								</label>
								{#if !data.product.deposit.enforce}
									<label class="checkbox-label">
										<input type="radio" value="full" name="deposit" bind:group={deposit} />
										{t('product.deposit.payFullPrice')}
									</label>
								{/if}
							{/if}
							{#if errorMessage}
								<p class="text-red-500">{errorMessage}</p>
							{/if}
							{#if amountAvailable === 0}
								<p class="text-red-500">
									<span class="font-bold">{t('product.outOfStock')}</span>
									<br />
									{t('product.checkBackLater')}
								</p>
							{:else if data.cartMaxSeparateItems && data.cart?.length === data.cartMaxSeparateItems}
								<p class="text-red-500">
									{t('cart.reachedMaxPerLine')}
								</p>
							{:else if data.showCheckoutButton}
								{#if data.product.hasSellDisclaimer && data.product.sellDisclaimer}
									<p class="text-xl font-bold">{data.product.sellDisclaimer.title}</p>
									<p>{data.product.sellDisclaimer.reason}</p>
									<label class="checkbox-labe col-span-3">
										<input
											type="checkbox"
											class="form-checkbox"
											form="checkout"
											name="acceptRestriction"
											bind:checked={acceptRestriction}
											required
										/>
										{t('ageWarning.agreement')}
									</label>
								{/if}
								<button class="btn body-cta body-mainCTA" disabled={!acceptRestriction || loading}
									>{t(`product.cta.${verb}`)}</button
								>
								<button
									formaction="?/addToCart"
									disabled={!acceptRestriction || loading}
									class="btn body-cta body-secondaryCTA"
								>
									{t('product.cta.add')}
								</button>
							{:else}
								<button
									formaction="?/addToCart"
									disabled={!acceptRestriction || loading}
									class="btn body-cta body-mainCTA"
								>
									{t(`product.cta.${verb}`)}
								</button>
							{/if}
						{:else}
							<p>{t('product.notForSale')}</p>
						{/if}
					</form>
				{:else if data.product.customPreorderText}
					<p>
						{data.product.customPreorderText}
					</p>
				{:else}
					<p>
						{t('product.availableOn', {
							date: new Date(data.product.availableDate).toLocaleDateString($locale, {
								year: 'numeric',
								month: 'long',
								day: 'numeric'
							})
						})}
					</p>
				{/if}
				{#if data.product.cta}
					{#each data.product.cta as cta}
						{#if !cta.fallback}
							<a
								href={cta.href}
								class="btn body-cta body-secondaryCTA h-auto min-h-[2em] break-words hyphens-auto text-center {!cta.label.includes(
									' '
								)
									? 'break-all'
									: ''} "
								target={cta.href.startsWith('http') ? '_blank' : '_self'}
							>
								{cta.label}
							</a>
						{:else if !canBuy || amountAvailable <= 0 || (data.cartMaxSeparateItems && data.cart?.length === data.cartMaxSeparateItems)}
							<a
								href={cta.href}
								class="btn body-cta body-secondaryCTA h-auto min-h-[2em] break-words hyphens-auto text-center {!cta.label.includes(
									' '
								)
									? 'break-all'
									: ''} "
								target={cta.href.startsWith('http') ? '_blank' : '_self'}
							>
								{cta.label}
							</a>
						{/if}
					{/each}
				{/if}

				<p class="prose body-secondaryText contents lg:hidden">
					<!-- eslint-disable svelte/no-at-html-tags -->
					{@html marked(data.product.description.replaceAll('<', '&lt;'))}
				</p>
			</div>
		</div>
	</div>
	{#if data.productCMSAfter}
		<CmsDesign
			challenges={data.productCMSAfter.challenges}
			tokens={data.productCMSAfter.tokens}
			sliders={data.productCMSAfter.sliders}
			tags={data.productCMSAfter.tags}
			products={data.productCMSAfter.products}
			pictures={data.productCMSAfter.pictures}
			digitalFiles={data.productCMSAfter.digitalFiles}
			roleId={data.roleId ? data.roleId : ''}
			specifications={data.productCMSAfter.specifications}
			contactForms={data.productCMSAfter.contactForms}
			pageName={data.product.name}
			websiteLink={data.websiteLink}
			brandName={data.brandName}
			sessionEmail={data.email}
			countdowns={data.productCMSAfter.countdowns}
			galleries={data.productCMSAfter.galleries}
			leaderboards={data.productCMSAfter.leaderboards}
			schedules={data.productCMSAfter.schedules}
			class={data.product.mobile?.hideContentAfter || data.hideCmsZonesOnMobile
				? 'hidden lg:contents'
				: ''}
		/>
	{/if}
</main>
