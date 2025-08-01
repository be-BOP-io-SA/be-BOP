<script lang="ts">
	import IconBasket from '$lib/components/icons/IconBasket.svelte';
	import PriceTag from '$lib/components/PriceTag.svelte';
	import { onMount } from 'svelte';
	import { afterNavigate, goto, invalidate } from '$app/navigation';
	import { navigating, page } from '$app/stores';
	import { UrlDependency } from '$lib/types/UrlDependency';
	import ProductAddedToCart from '$lib/components/ProductAddedToCart.svelte';
	import { productAddedToCart } from '$lib/stores/productAddedToCart';
	import { sum } from '$lib/utils/sum';
	import Popup from '$lib/components/Popup.svelte';
	import { applyAction, enhance } from '$app/forms';
	import Picture from '$lib/components/Picture.svelte';
	import CartQuantity from '$lib/components/CartQuantity.svelte';
	import IconTrash from '$lib/components/icons/IconTrash.svelte';
	import DEFAULT_LOGO from '$lib/assets/bebop-light.svg';
	import DEFAULT_LOGO_DARK from '$lib/assets/bebop-dark.svg';

	//import IconMenu from '~icons/ant-design/holder-outlined';
	import IconMenu from '~icons/ant-design/menu-outlined';
	import { slide } from 'svelte/transition';
	import { exchangeRate } from '$lib/stores/exchangeRate';
	import { currencies } from '$lib/stores/currencies';
	import { useI18n } from '$lib/i18n';
	import IconModeLight from '$lib/components/icons/IconModeLight.svelte';
	import IconModeDark from '$lib/components/icons/IconModeDark.svelte';
	import theme from '$lib/stores/theme';
	import { UNDERLYING_CURRENCY } from '$lib/types/Currency';
	import { isAlpha2CountryCode } from '$lib/types/Country.js';
	import IconInfo from '$lib/components/icons/IconInfo.svelte';
	import { computeDeliveryFees } from '$lib/cart';
	import { LARGE_SCREEN } from '$lib/types/Theme.js';
	import CmsDesign from '$lib/components/CmsDesign.svelte';
	import { toCurrency } from '$lib/utils/toCurrency.js';
	import IconSystem from '$lib/components/icons/IconSystem.svelte';
	import { oneMaxPerLine } from '$lib/types/Product.js';

	export let data;

	let topMenuOpen = false;
	let navMenuOpen = false;

	let cartErrorMessage = '';
	let cartErrorProductId = '';

	let actionCount = 0;

	$exchangeRate = data.exchangeRate;
	$currencies = data.currencies;

	$: $exchangeRate = data.exchangeRate;
	$: $currencies = data.currencies;

	$: items = data.cart.items;
	$: deliveryFees =
		data.countryCode && isAlpha2CountryCode(data.countryCode)
			? computeDeliveryFees(UNDERLYING_CURRENCY, data.countryCode, items, data.deliveryFees)
			: NaN;
	$: priceInfo = data.cart.priceInfo;
	$: totalItems = sum(items.map((item) => item.quantity) ?? []);

	onMount(() => {
		// Refresh exchange rate every 5 minutescomputeCartPrices
		const interval = setInterval(
			() =>
				fetch('/exchange-rate', {
					headers: {
						Accept: 'application/json'
					}
				})
					.then((r) => {
						if (!r.ok) {
							throw new Error('Error when fetching exchange rate: ' + r.status);
						}
						return r.json();
					})
					.then((val) => {
						$exchangeRate = val;
					}),
			5 * 60_000
		);

		return () => clearInterval(interval);
	});

	let cartOpen = false;

	$: if ($navigating) {
		topMenuOpen = false;
		navMenuOpen = false;
		$productAddedToCart = null;
	}

	afterNavigate(({ from, to }) => {
		if (from?.url.pathname !== to?.url.pathname) {
			cartOpen = false;
		}
	});

	$: if (items.length === 0) {
		cartOpen = false;
	}

	$: logoClass = data.logo.isWide ? 'h-[60px] w-auto' : 'h-[60px] w-[60px] rounded-full';
	const { t, locale, textAddress } = useI18n();

	$: isDigital = items.every((item) => !item.product.shipping);
	$: physicalCartCanBeOrdered =
		!!data.physicalCartMinAmount && !isDigital
			? priceInfo.partialPriceWithVat >=
			  toCurrency(priceInfo.currency, data.physicalCartMinAmount, data.currencies.main)
			: true;
	let ageWarning = false;

	let open = false;

	const options = [
		{ value: 'light', label: 'Clair', icon: IconModeLight },
		{ value: 'dark', label: 'Sombre', icon: IconModeDark },
		{ value: 'system', label: 'Système', icon: IconSystem }
	];

	function setTheme(value: string) {
		$theme = value as 'light' | 'dark' | 'system';
		localStorage.setItem('theme', value);
		open = false;
	}
</script>

<!--
	We use data-sveltekit-preload-data="off" on header/footer links due to this: 	https://github.com/sveltejs/kit/issues/9508#issuecomment-1807200239
-->

<div data-sveltekit-preload-data={data.isMaintenance ? 'tap' : 'hover'} style="display: contents;">
	{#if $page.data.layoutReset || $page.url.searchParams.get('display') === 'headless'}
		<slot />
	{:else}
		<header class="header items-center flex h-[100px] print:hidden">
			<div class="mx-auto max-w-7xl flex items-center gap-6 px-6 grow">
				<a class="flex items-center gap-4" href="/">
					{#if data.logoPicture}
						<Picture class="dark:hidden {logoClass}" picture={data.logoPicture} />
						<Picture
							class="hidden dark:inline {logoClass}"
							picture={data.logoPictureDark || data.logoPicture}
						/>
					{:else}
						<img class="hidden dark:inline {logoClass}" src={DEFAULT_LOGO} alt="" />
						<img class="dark:hidden {logoClass}" src={DEFAULT_LOGO_DARK} alt="" />
					{/if}
					{#if !data.logo.isWide}
						<span class="header-shopName font-bold text-[24px]">{data.brandName}</span>
					{/if}
				</a>
				<span class="grow body-mainPlan" />
				<nav class="flex gap-10 text-[22px] font-semibold header-tab">
					{#each data.links.topbar as link}
						<a
							href={link.href.includes('/') || /^[a-zA-Z]+:/.test(link.href)
								? link.href
								: `/${link.href}`}
							class=" {data.notResponsive ? '' : 'hidden lg:inline'}"
							data-sveltekit-preload-data="off"
							target={/^[a-zA-Z]+:/.test(link.href) ? '_blank' : '_self'}
						>
							{link.label}
						</a>
					{/each}
				</nav>
				<button
					class="inline-flex flex-col justify-center {data.notResponsive ||
					!data.links.topbar.length
						? 'hidden'
						: 'lg:hidden'} cursor-pointer text-4xl transition header-tab"
					class:rotate-90={topMenuOpen}
					on:click={() => (topMenuOpen = !topMenuOpen)}
				>
					<IconMenu />
				</button>
			</div>
		</header>
		{#if topMenuOpen}
			<nav
				transition:slide
				class="header print:hidden header-tab flex flex-col lg:hidden text-[22px] font-semibold border-x-0 border-b-0 border-opacity-25 border-t-1 border-white px-10 py-4"
			>
				{#each data.links.topbar as link}
					<a
						class="py-4"
						href={link.href.includes('/') || /^[a-zA-Z]+:/.test(link.href)
							? link.href
							: `/${link.href}`}
						target={/^[a-zA-Z]+:/.test(link.href) ? '_blank' : '_self'}
						data-sveltekit-preload-data="off">{link.label}</a
					>
				{/each}
			</nav>
		{/if}
		<header class="navbar h-[66px] items-center flex print:hidden">
			<div class="mx-auto max-w-7xl flex items-center gap-6 px-6 grow">
				<nav class="flex gap-6 font-light items-center">
					<button
						class="inline-flex flex-col justify-center {data.notResponsive ||
						!data.links.navbar.length
							? 'hidden'
							: 'lg:hidden'} cursor-pointer text-2xl transition"
						class:rotate-90={navMenuOpen}
						on:click={() => (navMenuOpen = !navMenuOpen)}
					>
						<IconMenu />
					</button>

					{#each data.links.navbar as link}
						<a
							href={link.href.includes('/') || /^[a-zA-Z]+:/.test(link.href)
								? link.href
								: `/${link.href}`}
							class={data.notResponsive ? '' : 'hidden lg:inline'}
							target={/^[a-zA-Z]+:/.test(link.href) ? '_blank' : '_self'}
							data-sveltekit-preload-data="off">{link.label}</a
						>
					{/each}
				</nav>

				<div class="flex items-center ml-auto gap-2">
					<div class="flex flex-row relative">
						{#if !data.hideCartInToolbar}
							<a
								href="/cart"
								on:click={(ev) => {
									const isMobile = window.innerWidth < LARGE_SCREEN;
									if (!items.length || $page.url.pathname === '/checkout' || isMobile) {
										return;
									}
									cartOpen = !cartOpen;
									ev.preventDefault();
								}}
								class="flex gap-2 items-center"
							>
								<IconBasket />
								{totalItems}
							</a>
						{/if}
						{#if $productAddedToCart && !$productAddedToCart.widget}
							<Popup>
								<ProductAddedToCart
									class="w-[562px] max-w-full"
									on:dismiss={() => ($productAddedToCart = null)}
									product={$productAddedToCart.product}
									picture={$productAddedToCart.picture}
									priceMultiplier={$productAddedToCart.priceMultiplier}
									customPrice={$productAddedToCart.customPrice}
									chosenVariations={$productAddedToCart.chosenVariations}
									depositPercentage={$productAddedToCart.depositPercentage}
									discountPercentage={$productAddedToCart.discountPercentage}
									removePopinProductPrice={data.removePopinProductPrice}
								/>
							</Popup>
						{:else if cartOpen}
							<Popup>
								<div class="p-2 gap-2 flex flex-col cartPreview">
									{#each items as item, i}
										{@const price = priceInfo.perItem[i]}
										{#if cartErrorMessage && cartErrorProductId === item.product._id}
											<div class="text-red-600 text-sm">{cartErrorMessage}</div>
										{/if}
										<form
											class="flex border-b border-gray-300 pb-2 gap-2"
											method="POST"
											use:enhance={({ action }) => {
												cartErrorMessage = '';
												if (action.searchParams.has('/increase')) {
													item.quantity++;
												} else if (action.searchParams.has('/decrease')) {
													item.quantity--;
												} else if (action.searchParams.has('/remove')) {
													item.quantity = 0;
												}
												actionCount++;
												let currentCount = actionCount;

												return async ({ result }) => {
													if (actionCount === currentCount) {
														if (result.type === 'redirect') {
															// Invalidate all to remove 0-quantity items
															await goto(result.location, {
																noScroll: true,
																invalidateAll: true
															});
															return;
														}
														if (result.type === 'error' && result.error?.message) {
															cartErrorMessage = result.error.message;
															cartErrorProductId = item.product._id;
															await invalidate(UrlDependency.Cart);
															return;
														}
														await applyAction(result);
													}
												};
											}}
										>
											{#if item._id}
												<input type="hidden" name="lineId" value={item._id} />
											{/if}
											{#if item.depositPercentage ?? undefined !== undefined}
												<input
													type="hidden"
													name="depositPercentage"
													value={item.depositPercentage}
												/>
											{/if}
											<a
												href="/product/{item.product._id}"
												class="w-[44px] h-[44px] min-w-[44px] min-h-[44px] rounded flex items-center"
											>
												{#if item.picture}
													<Picture
														picture={item.picture}
														class="mx-auto rounded h-full object-contain"
														sizes="44px"
													/>
												{/if}
											</a>
											<div class="flex flex-col">
												<a href="/product/{item.product._id}">
													<h3 class="text-base font-medium">
														{item.chosenVariations
															? item.product.name +
															  ' - ' +
															  Object.entries(item.chosenVariations)
																	.map(
																		([key, value]) =>
																			item.product.variationLabels?.values[key][value]
																	)
																	.join(' - ')
															: item.product.name}
													</h3>
												</a>
												{#if !oneMaxPerLine(item.product)}
													<div class="flex items-center gap-2">
														<span class="text-xs">{t('cart.quantity')}: </span>
														<CartQuantity {item} sm disabled={!data.cartPreviewInteractive} />
													</div>
												{/if}
											</div>

											<div class="flex flex-col items-end gap-[6px] ml-auto">
												<PriceTag
													class="text-base"
													amount={(price.amount * (item.depositPercentage ?? 100)) / 100}
													currency={price.currency}
													main
													>{item.depositPercentage
														? `(${(item.depositPercentage / 100).toLocaleString($locale, {
																style: 'percent'
														  })})`
														: ''}
												</PriceTag>
												{#if data.cartPreviewInteractive}
													<button formaction="/cart/{item.product._id}/?/remove">
														<IconTrash class="body-secondaryText" />
														<span class="sr-only">{t('cart.sr.remove')}</span>
													</button>
												{/if}
											</div>
										</form>
									{/each}
									{#if deliveryFees}
										<div class="flex gap-1 text-lg justify-end items-center">
											{t('checkout.deliveryFees')}
											<div
												title={t('checkout.deliveryFeesEstimationTooltip')}
												class="cursor-pointer"
											>
												<IconInfo />
											</div>

											<PriceTag
												class="truncate"
												amount={deliveryFees}
												currency={UNDERLYING_CURRENCY}
												main
											/>
										</div>
									{:else if isNaN(deliveryFees)}
										<div class="alert-error mt-3">
											{t('checkout.noDeliveryInCountry')}
										</div>
									{/if}
									{#if items.some((item) => item.product.shipping) && priceInfo.physicalVatAtCustoms}
										<div class="flex gap-1 text-lg justify-end items-center">
											{t('product.vatExcluded')}
											<div title={t('cart.vatNullOutsideSellerCountry')}>
												<IconInfo class="cursor-pointer" />
											</div>
										</div>
									{/if}
									{#each priceInfo.vat as vat}
										<div class="flex gap-1 text-lg justify-end items-center">
											{t('cart.vat')} ({vat.rate}%) <PriceTag
												currency={vat.partialPrice.currency}
												amount={vat.partialPrice.amount}
												main
											/>
										</div>
									{/each}
									<div class="flex gap-1 text-xl justify-end items-center">
										{t('cart.total')}
										<PriceTag
											currency={priceInfo.currency}
											amount={priceInfo.partialPriceWithVat}
											main
										/>
									</div>
									{#if priceInfo.totalPriceWithVat !== priceInfo.partialPriceWithVat}
										<div class="flex gap-1 text-lg justify-end items-center">
											{t('cart.remainingShort')}
											<PriceTag
												currency={priceInfo.currency}
												amount={priceInfo.totalPriceWithVat - priceInfo.partialPriceWithVat}
												main
											/>
										</div>
									{/if}
									<a href="/cart" class="btn cartPreview-mainCTA mt-1 whitespace-nowrap">
										{t('cart.cta.view')}
									</a>
									<a
										href="/checkout"
										class="btn cartPreview-secondaryCTA {!physicalCartCanBeOrdered
											? 'opacity-50'
											: ''}"
										style="pointer-events: {!physicalCartCanBeOrdered ? 'none' : ''};"
									>
										{t('cart.cta.checkout')}
									</a>
								</div>
							</Popup>
						{/if}
						{#if !data.hideThemeSelectorInToolbar}
							<div class="flex relative">
								<button
									class="ml-4 flex items-center gap-2 rounded text-xl"
									on:click={() => (open = !open)}
								>
									{#each options as opt (opt.value)}
										{#if opt.value === $theme}
											<svelte:component this={opt.icon} class="w-5 h-5" />
										{/if}
									{/each}
								</button>

								{#if open}
									<div class="absolute left-10 mt-2 shadow-lg rounded z-10 navbar">
										{#each options as opt}
											<button
												class="flex items-center gap-2 w-full px-4 py-2 text-left"
												on:click={() => setTheme(opt.value)}
											>
												<svelte:component this={opt.icon} class="w-5 h-5" />
												<span class="hidden lg:contents">{opt.label}</span>
											</button>
										{/each}
									</div>
								{/if}
							</div>
						{/if}

						{#if !data.disableLanguageSelector && data.locales.length > 1}
							<select
								class="ml-4 border-0 cursor-pointer rounded appearance-none bg-none bg-transparent text-xl p-0"
								size="0"
								bind:value={$locale}
								on:change={() => {
									document.cookie = `lang=${$locale};path=/;max-age=31536000`;
									window.location.reload();
								}}
							>
								{#each data.locales as locale}
									<option style="background-color: var(--navbar-backgroundColor);" value={locale}>
										{locale}
									</option>
								{/each}
							</select>
						{/if}
					</div>
				</div>
			</div>
		</header>
		{#if navMenuOpen}
			<nav
				transition:slide
				class="navbar print:hidden header-tab font-light flex flex-col lg:hidden border-x-0 border-b-0 border-opacity-25 border-t-1 border-white px-4 pb-3"
			>
				{#each data.links.navbar as link}
					<a
						class="py-2 hover:underline"
						data-sveltekit-preload-data="off"
						href={link.href.includes('/') || /^[a-zA-Z]+:/.test(link.href)
							? link.href
							: `/${link.href}`}>{link.label}</a
					>
				{/each}
			</nav>
		{/if}

		{#if $page.url.pathname.startsWith('/admin')}
			<div class="grow body-mainPlan">
				<slot />
			</div>
		{:else if $page.url.pathname === '/pos'}
			<div class="grow body-mainPlan">
				<slot />
			</div>
		{:else}
			<div class="grow body-mainPlan">
				{#if data.ageRestriction.enabled && !data.sessionAcceptAgeLimitation && !$page.url.pathname.startsWith('/admin')}
					<form class="mx-auto max-w-7xl" method="POST" action="{data.websiteLink}?/navigate">
						{#if data.cmsAgewall && data.cmsAgewallData}
							<CmsDesign
								{...data.cmsAgewallData}
								hasPosOptions={data.hasPosOptions}
								pageName={data.cmsAgewall?.title}
								websiteLink={data.websiteLink}
								brandName={data.brandName}
								sessionEmail={data.email}
								class={data.hideCmsZonesOnMobile ? 'hidden lg:contents' : ''}
							/>
						{/if}
						<label class="label-checkbox my-4">
							<input type="checkbox" class="form-checkbox" bind:checked={ageWarning} />
							{t('ageWarning.agreement')}
						</label>
						<input
							type="submit"
							class="btn body-mainCTA my-4 w-full"
							value={t('ageWarning.navigate')}
							disabled={!ageWarning}
						/>
					</form>
				{:else}
					<slot />
				{/if}
			</div>
		{/if}

		<footer class="footer h-auto items-center flex print:hidden">
			<div
				class="mx-auto max-w-7xl px-6 py-6 items-start justify-between gap-y-8 w-full grid grid-cols-1 lg:flex lg:flex-wrap gap-4"
			>
				{#if data.displayCompanyInfo && data.sellerIdentity}
					<div>
						<h3 class="text-lg font-semibold mb-2 uppercase">{t('footer.company.identity')}</h3>
						<p class="whitespace-pre-line">
							{textAddress({
								firstName: data.sellerIdentity.businessName,
								lastName: '',
								address: data.sellerIdentity.address.street,
								zip: data.sellerIdentity.address.zip,
								city: data.sellerIdentity.address.city,
								country: data.sellerIdentity.address.country,
								state: data.sellerIdentity.address.state
							})}
						</p>
					</div>
				{/if}

				{#if data.displayMainShopInfo && data.shopInformation}
					<div>
						<h3 class="text-lg font-semibold mb-2 uppercase">{t('footer.shop.info')}</h3>
						<p class="whitespace-pre-line">
							{textAddress({
								firstName: data.shopInformation.businessName,
								lastName: '',
								address: data.shopInformation.address.street,
								zip: data.shopInformation.address.zip,
								city: data.shopInformation.address.city,
								country: data.shopInformation.address.country,
								state: data.shopInformation.address.state
							})}
						</p>
					</div>
				{/if}

				{#if data.displayCompanyInfo && data.sellerIdentity}
					{#if data.sellerIdentity.contact.email || data.sellerIdentity.contact.phone}
						<div>
							<h3 class="text-lg font-semibold mb-2 uppercase">{t('footer.company.contact')}</h3>
							{#if data.sellerIdentity.contact.email}
								<a href="mailto:{data.sellerIdentity.contact.email}">
									{data.sellerIdentity.contact.email}
								</a>
							{/if}
							<br />
							{#if data.sellerIdentity.contact.phone}
								<a href="tel:{data.sellerIdentity.contact.phone}">
									{data.sellerIdentity.contact.phone}
								</a>
							{/if}
						</div>
					{/if}
				{/if}

				<div class="flex flex-col gap-4 items-end lg:items-center">
					<div class="flex items-end lg:flex-row flex-col gap-2">
						{#each data.links.footer as link}
							<a
								class={link.label === '-' ? 'hidden lg:contents' : ''}
								href={link.href.includes('/') || /^[a-zA-Z]+:/.test(link.href)
									? link.href
									: `/${link.href}`}
								target={/^[a-zA-Z]+:/.test(link.href) ? '_blank' : '_self'}
								data-sveltekit-preload-data="off">{link.label}</a
							>
						{/each}
					</div>
					<div class="flex flex-row gap-1">
						{#each data.links.socialNetworkIcons as icon}
							<a href={icon.href} target="_blank"
								><img src="data:image/svg+xml;utf8, {icon.svg}" alt={icon.name} /></a
							>
						{/each}
					</div>
				</div>

				{#if data.footerLogoId}
					<div class="flex w-full">
						<Picture class={logoClass} picture={data.footerPicture} />
					</div>
				{:else if data.displayPoweredBy}
					<div class="justify-center lg:justify-normal flex w-full">
						<a
							class="items-center gap-4"
							href="https://be-bop.io?lang={data.language}"
							target="_blank"
						>
							<span class="font-light">{t('footer.poweredBy')} </span>
							<img class="h-[40px] w-auto hidden dark:inline" src={DEFAULT_LOGO} alt="" />
							<img class="h-[40px] w-auto dark:hidden inline" src={DEFAULT_LOGO_DARK} alt="" />
						</a>
					</div>
				{/if}
			</div>
		</footer>
	{/if}
</div>
