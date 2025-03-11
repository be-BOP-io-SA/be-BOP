<script lang="ts">
	import { applyAction, enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import CartQuantity from '$lib/components/CartQuantity.svelte';
	import Picture from '$lib/components/Picture.svelte';
	import PriceTag from '$lib/components/PriceTag.svelte';
	import { bech32 } from 'bech32';
	import { typedValues } from '$lib/utils/typedValues';
	import { typedInclude } from '$lib/utils/typedIncludes';
	import ProductType from '$lib/components/ProductType.svelte';
	import { computeDeliveryFees, computePriceInfo } from '$lib/types/Cart';
	import IconInfo from '$lib/components/icons/IconInfo.svelte';
	import { toCurrency } from '$lib/utils/toCurrency.js';
	import { UNDERLYING_CURRENCY } from '$lib/types/Currency.js';
	import { POS_ROLE_ID } from '$lib/types/User.js';
	import { toSatoshis } from '$lib/utils/toSatoshis';
	import { MIN_SATOSHIS_FOR_BITCOIN_PAYMENT, type DiscountType } from '$lib/types/Order.js';
	import { useI18n } from '$lib/i18n';
	import Trans from '$lib/components/Trans.svelte';
	import CmsDesign from '$lib/components/CmsDesign.svelte';
	import { trimPrefix } from '$lib/utils/trimPrefix.js';

	export let data;
	let submitting = false;

	let actionCount = 0;
	const defaultShippingCountry =
		(data.personalInfoConnected?.address?.country ?? data.countryCode) || data.vatCountry || 'FR';
	const digitalCountry = data.countryCode || data.vatCountry || 'FR';
	let country = defaultShippingCountry;

	let isFreeVat = false;
	let onLocation = data.roleId === POS_ROLE_ID && data.defaultOnLocation;
	$: offerDeliveryFees = onLocation;
	let addDiscount = false;
	let offerOrder = false;
	let discountAmount = 0;
	let discountType: DiscountType;
	$: {
		if (offerOrder) {
			discountType = 'percentage';
			discountAmount = 100;
		} else {
			if (discountType !== 'percentage' || discountAmount !== 100) {
				offerOrder = false;
			}
		}
	}

	let multiplePaymentMethods = false;

	const { t, locale, countryName, sortedCountryCodes } = useI18n();

	const feedItems = [
		{ key: 'paymentStatus', label: t('checkout.paymentStatus') }
		// { key: 'productChanges', label: 'Product changes' },
		// { key: 'newsletter', label: 'Newsletter' }
	] as const;

	type FeedKey = (typeof feedItems)[number]['key'];

	const npubInputs: Record<FeedKey, HTMLInputElement | null> = {
		paymentStatus: null
		// productChanges: null,
		// newsletter: null
	};

	const emails: Record<FeedKey, string> = {
		paymentStatus:
			data.roleId === POS_ROLE_ID ? '' : data.email || data.personalInfoConnected?.email || ''
	};

	const npubs: Record<FeedKey, string> = {
		paymentStatus:
			data.roleId === POS_ROLE_ID ? '' : data.npub || data.personalInfoConnected?.npub || ''
	};

	function checkForm(event: SubmitEvent) {
		submitting = true;
		try {
			for (const input of typedValues(npubInputs)) {
				if (!input) {
					continue;
				}

				input.value = trimPrefix(input.value.trim(), 'nostr:');
				if (
					input.value &&
					(!input.value.startsWith('npub1') || bech32.decodeUnsafe(input.value)?.prefix !== 'npub')
				) {
					input.setCustomValidity(t('checkout.invalidNpub'));
					input.reportValidity();

					event.preventDefault();
					return;
				}
			}
		} finally {
			submitting = false;
		}
	}

	let paymentMethod: (typeof paymentMethods)[0] | undefined = undefined;
	$: paymentMethod = typedInclude(paymentMethods, paymentMethod)
		? paymentMethod
		: paymentMethods[0];

	$: items = data.cart || [];
	$: deliveryFees =
		data.roleId === 'POS_ROLE_ID' && data.deliveryFees.allowFreeForPOS
			? 0
			: computeDeliveryFees(UNDERLYING_CURRENCY, country, items, data.deliveryFees);

	$: priceInfo = computePriceInfo(items, {
		bebopCountry: data.vatCountry,
		vatSingleCountry: data.vatSingleCountry,
		vatNullOutsideSellerCountry: data.vatNullOutsideSellerCountry,
		vatExempted: data.vatExempted || isFreeVat,
		userCountry: isDigital ? digitalCountry : country,
		deliveryFees: {
			amount: offerDeliveryFees ? 0 : deliveryFees || 0,
			currency: UNDERLYING_CURRENCY
		},
		vatProfiles: data.vatProfiles,
		...(addDiscount &&
			!isNaN(discountAmount) && {
				discount: {
					amount: discountAmount,
					type: discountType
				}
			})
	});
	$: priceInfoInitial = computePriceInfo(items, {
		bebopCountry: data.vatCountry,
		vatSingleCountry: data.vatSingleCountry,
		vatNullOutsideSellerCountry: data.vatNullOutsideSellerCountry,
		vatExempted: data.vatExempted || isFreeVat,
		userCountry: isDigital ? digitalCountry : country,
		deliveryFees: {
			amount: offerDeliveryFees ? 0 : deliveryFees || 0,
			currency: UNDERLYING_CURRENCY
		},
		vatProfiles: data.vatProfiles
	});

	$: isDigital = items.every((item) => !item.product.shipping);

	$: paymentMethods =
		priceInfo.totalPriceWithVat === 0
			? ['free']
			: data.paymentMethods.filter(
					(method) =>
						method !== 'free' &&
						(method === 'bitcoin'
							? toCurrency('SAT', priceInfo.partialPriceWithVat, priceInfo.currency) >=
							  MIN_SATOSHIS_FOR_BITCOIN_PAYMENT
							: true)
			  );
	$: isDiscountValid =
		(discountType === 'fiat' &&
			priceInfoInitial.totalPriceWithVat >=
				toSatoshis(discountAmount || 0, data.currencies.main)) ||
		(discountType === 'percentage' && discountAmount <= 100);
	let showBillingInfo = false;
	let isProfessionalOrder = false;
	let changePaymentTimeOut = false;
</script>

<main class="mx-auto max-w-7xl py-10 px-6 body-mainPlan">
	{#if data.cmsCheckoutTop && data.cmsCheckoutTopData}
		<CmsDesign
			challenges={data.cmsCheckoutTopData.challenges}
			tokens={data.cmsCheckoutTopData.tokens}
			sliders={data.cmsCheckoutTopData.sliders}
			products={data.cmsCheckoutTopData.products}
			pictures={data.cmsCheckoutTopData.pictures}
			tags={data.cmsCheckoutTopData.tags}
			digitalFiles={data.cmsCheckoutTopData.digitalFiles}
			roleId={data.roleId ? data.roleId : ''}
			specifications={data.cmsCheckoutTopData.specifications}
			contactForms={data.cmsCheckoutTopData.contactForms}
			pageName={data.cmsCheckoutTop.title}
			websiteLink={data.websiteLink}
			brandName={data.brandName}
			sessionEmail={data.email}
			countdowns={data.cmsCheckoutTopData.countdowns}
			galleries={data.cmsCheckoutTopData.galleries}
			leaderboards={data.cmsCheckoutTopData.leaderboards}
			class={data.hideCmsZonesOnMobile ? 'hidden lg:contents' : ''}
		/>
	{/if}
	<div
		class="w-full rounded-xl body-mainPlan border-gray-300 lg:p-6 p-2 lg:grid gap-4 lg:gap-2 lg:grid-cols-3 sm:flex-wrap"
	>
		<form id="checkout" method="post" class="col-span-2 flex gap-4 flex-col" on:submit={checkForm}>
			<h1 class="page-title body-title">{t('checkout.title')}</h1>
			<section class="gap-4 grid grid-cols-6">
				<h2 class="font-light text-2xl col-span-6">{t('checkout.shipmentInfo')}</h2>
				{#if isDigital}
					<p class="col-span-6">
						{t('checkout.digitalNoShippingNeeded')}
					</p>
				{:else}
					<label class="form-label col-span-3">
						{t('address.firstName')}
						<input
							type="text"
							class="form-input"
							name="shipping.firstName"
							autocomplete="given-name"
							required={data.roleId !== POS_ROLE_ID}
							value={data.personalInfoConnected?.firstName ??
								(data.roleId === POS_ROLE_ID && data.shopInformation?.businessName
									? data.shopInformation.businessName
									: '') ??
								''}
						/>
					</label>

					<label class="form-label col-span-3">
						{t('address.lastName')}
						<input
							type="text"
							class="form-input"
							name="shipping.lastName"
							autocomplete="family-name"
							required={data.roleId !== POS_ROLE_ID}
							value={data.personalInfoConnected?.lastName ?? ''}
						/>
					</label>

					<label class="form-label col-span-6">
						{t('address.address')}
						<input
							type="text"
							class="form-input"
							autocomplete="street-address"
							name="shipping.address"
							required={data.roleId !== POS_ROLE_ID}
							value={data.personalInfoConnected?.address?.street ??
								(data.roleId === POS_ROLE_ID && data.shopInformation?.address?.street
									? data.shopInformation.address.street
									: '') ??
								''}
						/>
					</label>

					<label class="form-label col-span-3">
						{t('address.country')}
						<select name="shipping.country" class="form-input" required bind:value={country}>
							{#each sortedCountryCodes() as code}
								<option value={code}>{countryName(code)}</option>
							{/each}
						</select>
					</label>

					<span class="col-span-3" />

					<label class="form-label col-span-2">
						{t('address.state')}

						<input
							type="text"
							name="shipping.state"
							class="form-input"
							value={data.personalInfoConnected?.address?.state ??
								(data.roleId === POS_ROLE_ID && data.shopInformation?.address?.state
									? data.shopInformation.address.state
									: '') ??
								''}
						/>
					</label>
					<label class="form-label col-span-2">
						{t('address.city')}

						<input
							type="text"
							name="shipping.city"
							class="form-input"
							value={data.personalInfoConnected?.address?.city ??
								(data.roleId === POS_ROLE_ID && data.shopInformation?.address?.city
									? data.shopInformation.address.city
									: '') ??
								''}
							required={data.roleId !== POS_ROLE_ID}
						/>
					</label>
					<label class="form-label col-span-2">
						{t('address.zipCode')}

						<input
							type="text"
							name="shipping.zip"
							class="form-input"
							value={data.personalInfoConnected?.address?.zip ??
								(data.roleId === POS_ROLE_ID && data.shopInformation?.address?.zip
									? data.shopInformation.address.zip
									: '') ??
								''}
							required={data.roleId !== POS_ROLE_ID}
							autocomplete="postal-code"
						/>
					</label>
					<label class="form-label col-span-6">
						{t('address.phone')}
						<input
							type="tel"
							name="shipping.phone"
							class="form-input"
							value={data.roleId === POS_ROLE_ID && data.shopInformation?.contact?.phone
								? data.shopInformation.contact.phone
								: ''}
						/>
					</label>
					<p class="col-span-6">
						{t('address.phoneDisclaimer')}
					</p>
					<p class="col-span-6">
						{t('address.phoneCode')}
					</p>

					<label class="col-span-6 checkbox-label">
						<input
							type="checkbox"
							class="form-checkbox"
							form="checkout"
							bind:checked={showBillingInfo}
						/>
						{t('checkout.differentBillingAddress')}
					</label>
				{/if}
				{#if !data.noProBilling}
					<label class="col-span-6 checkbox-label">
						<input
							type="checkbox"
							class="form-checkbox"
							form="checkout"
							name="billing.isCompany"
							bind:checked={isProfessionalOrder}
						/>
						{t('checkout.isProBilling')}
					</label>
				{/if}
				{#if data.defaultOnLocation && data.roleId === POS_ROLE_ID && !isDigital}
					<label class="col-span-6 checkbox-label">
						<input
							type="checkbox"
							class="form-checkbox"
							form="checkout"
							name="onLocation"
							bind:checked={onLocation}
						/>
						{t('checkout.onLocation')}
					</label>
				{/if}
			</section>

			{#if showBillingInfo || (isDigital && data.isBillingAddressMandatory) || isProfessionalOrder}
				<section class="gap-4 grid grid-cols-6">
					<h2 class="font-light text-2xl col-span-6">{t('checkout.billingInfo')}</h2>

					<label class="form-label col-span-3">
						{t('address.firstName')}
						<input
							type="text"
							class="form-input"
							name="billing.firstName"
							autocomplete="given-name"
							value={data.personalInfoConnected?.firstName ?? ''}
							required={!isProfessionalOrder}
						/>
					</label>

					<label class="form-label col-span-3">
						{t('address.lastName')}
						<input
							type="text"
							class="form-input"
							name="billing.lastName"
							autocomplete="family-name"
							value={data.personalInfoConnected?.lastName ?? ''}
							required={!isProfessionalOrder}
						/>
					</label>

					<label class="form-label col-span-6">
						{t('address.address')}
						<input
							type="text"
							class="form-input"
							autocomplete="street-address"
							name="billing.address"
							value={data.personalInfoConnected.address?.street ?? ''}
							required
						/>
					</label>

					<label class="form-label col-span-3">
						{t('address.country')}
						<select
							name="billing.country"
							class="form-input"
							required
							value={defaultShippingCountry}
						>
							{#each sortedCountryCodes() as code}
								<option value={code}>{countryName(code)}</option>
							{/each}
						</select>
					</label>

					<span class="col-span-3" />

					<label class="form-label col-span-2">
						{t('address.state')}

						<input
							type="text"
							name="billing.state"
							class="form-input"
							value={data.personalInfoConnected.address?.state ?? ''}
						/>
					</label>
					<label class="form-label col-span-2">
						{t('address.city')}

						<input
							type="text"
							name="billing.city"
							class="form-input"
							value={data.personalInfoConnected.address?.city ?? ''}
							required
						/>
					</label>
					<label class="form-label col-span-2">
						{t('address.zipCode')}

						<input
							type="text"
							name="billing.zip"
							class="form-input"
							value={data.personalInfoConnected.address?.zip ?? ''}
							required
							autocomplete="postal-code"
						/>
					</label>
					{#if isProfessionalOrder}
						<label class="form-label col-span-3">
							{t('address.companyName')}
							<input type="text" class="form-input" name="billing.companyName" />
						</label>

						<label class="form-label col-span-3">
							{t('address.vatNumber')}
							<input type="text" class="form-input" name="billing.vatNumber" />
						</label>
					{/if}
				</section>
			{/if}

			<section class="gap-4 flex flex-col">
				<h2 class="font-light text-2xl">{t('checkout.payment.title')}</h2>

				{#if data.roleId === POS_ROLE_ID}
					<label class="checkbox-label">
						<input
							type="checkbox"
							name="multiplePaymentMethods"
							class="form-checkbox"
							bind:checked={multiplePaymentMethods}
						/>
						{t('checkout.multiplePaymentMethods')}
					</label>
				{/if}

				{#if multiplePaymentMethods}
					<p>{t('checkout.multiplePaymentMethodsHelpText')}</p>
				{:else}
					<label class="form-label col-span-6">
						{t('checkout.payment.method')}

						<div class="grid grid-cols-2 gap-4 items-center">
							<select
								name="paymentMethod"
								class="form-input"
								bind:value={paymentMethod}
								disabled={paymentMethods.length === 0}
								required
							>
								{#each paymentMethods as paymentMethod}
									<option value={paymentMethod}>
										{t('checkout.paymentMethod.' + paymentMethod)}
									</option>
								{/each}
							</select>
							{#if paymentMethods.length === 0}
								<p class="text-red-400">{t('checkout.paymentMethod.unavailable')}</p>
							{/if}
							{#if 0}
								<a href="/connect" class="underline body-hyperlink"> Connect another wallet </a>
							{/if}
						</div>
					</label>
				{/if}
				{#if data.roleId === POS_ROLE_ID && paymentMethod !== 'point-of-sale' && paymentMethod !== 'bank-transfer'}
					<label class="checkbox-label">
						<input
							type="checkbox"
							name="changePaymentTimeOut"
							class="form-checkbox"
							bind:checked={changePaymentTimeOut}
						/>
						{t('checkout.changePaymentExpiration')}
					</label>
					<label class="form-label col-span-6">
						<div class="grid grid-cols-2 gap-4 items-center">
							<input
								type="number"
								name="paymentTimeOut"
								class="form-input"
								min="1"
								value={data.desiredPaymentTimeout}
								disabled={!changePaymentTimeOut}
								required={changePaymentTimeOut}
							/>
						</div>
					</label>
				{/if}
			</section>

			<section class="gap-4 flex flex-col">
				<h2 class="font-light text-2xl">{t('checkout.notifications.title')}</h2>
				<p>
					{t('checkout.notifications.message')}
				</p>

				{#each feedItems as { key, label }}
					<article class="rounded border border-gray-300 overflow-hidden flex flex-col">
						<div class="pl-4 py-2 body-mainPlan border-b border-gray-300 text-base font-light">
							{label}
						</div>
						<div class="p-4 flex flex-col gap-3">
							{#if data.emailsEnabled && data.contactModes.includes('email')}
								<label class="form-label">
									{t('checkout.notifications.email')}
									<input
										type="email"
										class="form-input"
										autocomplete="email"
										name="{key}Email"
										bind:value={emails[key]}
										required={key === 'paymentStatus' &&
											data.roleId !== POS_ROLE_ID &&
											(!npubs[key] || !data.contactModes.includes('nostr'))}
									/>
								</label>
							{/if}
							{#if data.contactModes.includes('nostr')}
								<label class="form-label">
									{t('checkout.notifications.npub')}
									<input
										type="text"
										class="form-input"
										bind:this={npubInputs[key]}
										bind:value={npubs[key]}
										name="{key}NPUB"
										placeholder="npub1XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
										required={key === 'paymentStatus' &&
											(!emails[key] || !data.contactModes.includes('email')) &&
											data.roleId !== POS_ROLE_ID}
										on:change={(ev) => ev.currentTarget.setCustomValidity('')}
									/>
								</label>
							{/if}
						</div>
						{#if data.displayNewsletterCommercialProspection}
							<div class="p-4 flex flex-col gap-3">
								<label class="checkbox-label col-span-3">
									<input
										class="form-checkbox"
										type="checkbox"
										checked={data.personalInfoConnected?.newsletter?.seller ?? false}
										name="newsletter.seller"
									/>
									{t('newsletter.allowSellerContact')}
								</label>
								<label class="checkbox-label col-span-3">
									<input
										class="form-checkbox"
										type="checkbox"
										checked={data.personalInfoConnected?.newsletter?.partner ?? false}
										name="newsletter.partner"
									/>
									{t('newsletter.allowPartnerContact')}
								</label>
							</div>
						{/if}
					</article>
				{/each}
			</section>
			<section class="gap-4 flex flex-col">
				<article class="rounded border border-gray-300 overflow-hidden flex flex-col">
					<div class="pl-4 py-2 body-mainPlan border-b border-gray-300 text-xl font-light">
						{t('checkout.note.title')}
					</div>
					{#if data.roleId === POS_ROLE_ID}
						<div class="p-4 flex flex-col gap-3">
							<label class="form-label text-xl">
								{t('checkout.receiptNote.label')}
								<textarea name="receiptNoteContent" cols="30" rows="2" class="form-input" />
							</label>
						</div>{/if}
					<div class="p-4 flex flex-col gap-3">
						<label class="form-label text-xl">
							{t('checkout.note.label')}

							<textarea name="noteContent" cols="30" rows="2" class="form-input" />
						</label>
					</div>
				</article>
			</section>
		</form>
		<div class="w-full md:w-auto mt-6">
			<article
				class="rounded sticky top-4 md:-mr-2 md:-mt-2 p-3 border border-gray-300 flex flex-col overflow-hidden gap-1"
			>
				<div class="flex justify-between">
					<a href="/cart" class="body-hyperlink hover:underline"
						>&lt;&lt;{t('checkout.backToCart')}</a
					>
					<p>{t('checkout.numProducts', { count: data.cart?.length ?? 0 })}</p>
				</div>
				{#each items as item}
					{@const price = item.customPrice || item.product.price}
					<form
						method="POST"
						class="flex flex-col mt-2"
						use:enhance={({ action }) => {
							if (action.searchParams.has('/increase')) {
								item.quantity++;
							} else if (action.searchParams.has('/decrease')) {
								item.quantity--;
							} else if (action.searchParams.has('/remove')) {
								item.quantity = 0;
							}
							actionCount++;
							let currentActionCount = actionCount;

							return async ({ result }) => {
								if (actionCount === currentActionCount) {
									if (result.type === 'redirect') {
										// Invalidate all to remove 0-quantity items
										await goto(result.location, { noScroll: true, invalidateAll: true });
										return;
									}
									await applyAction(result);
								}
							};
						}}
					>
						{#if item.depositPercentage ?? undefined !== undefined}
							<input type="hidden" name="depositPercentage" value={item.depositPercentage} />
						{/if}
						<a href="/product/{item.product._id}">
							<h3 class="text-base">
								{item.chosenVariations
									? item.product.name +
									  ' - ' +
									  Object.entries(item.chosenVariations)
											.map(([key, value]) => item.product.variationLabels?.values[key][value])
											.join(' - ')
									: item.product.name}
							</h3>
						</a>

						<div class="flex flex-row gap-2">
							<a
								href="/product/{item.product._id}"
								class="w-[50px] h-[50px] min-w-[50px] min-h-[50px] rounded flex items-center"
							>
								{#if item.picture}
									<Picture
										picture={item.picture}
										class="mx-auto rounded h-full object-contain"
										sizes="50px"
									/>
								{/if}
							</a>
							<div class="flex flex-col">
								<div class="flex flex-wrap mb-1 gap-3">
									<ProductType
										product={item.product}
										class="text-sm hidden"
										hasDigitalFiles={item.digitalFiles.length >= 1}
										depositPercentage={item.depositPercentage}
									/>
								</div>
								<div>
									{#if 0}
										<CartQuantity {item} sm />
									{:else if item.quantity > 1}
										{t('cart.quantity')}: {item.quantity}
									{/if}
								</div>
							</div>

							<div class="flex flex-col ml-auto items-end justify-center">
								<PriceTag
									class="text-2xl truncate"
									amount={(item.quantity * price.amount * (item.depositPercentage ?? 100)) / 100}
									currency={price.currency}
									main
									>{item.depositPercentage
										? `(${(item.depositPercentage / 100).toLocaleString($locale, {
												style: 'percent'
										  })})`
										: ''}</PriceTag
								>
								<PriceTag
									amount={(item.quantity * price.amount * (item.depositPercentage ?? 100)) / 100}
									currency={price.currency}
									class="text-base truncate"
									secondary
								/>
							</div>
						</div>
					</form>

					<div class="border-b border-gray-300 col-span-4" />
				{/each}

				{#if deliveryFees && !offerDeliveryFees}
					<div class="flex justify-between items-center">
						<h3 class="text-base">{t('checkout.deliveryFees')}</h3>

						<div class="flex flex-col ml-auto items-end justify-center">
							<PriceTag
								class="text-2xl truncate"
								amount={deliveryFees}
								currency={UNDERLYING_CURRENCY}
								main
							/>
							<PriceTag
								amount={deliveryFees}
								currency={UNDERLYING_CURRENCY}
								class="text-base truncate"
								secondary
							/>
						</div>
					</div>
					<div class="border-b border-gray-300 col-span-4" />
				{:else if isNaN(deliveryFees)}
					<div class="alert-error mt-3">
						{t('checkout.noDeliveryInCountry')}
					</div>
				{/if}

				{#if !isDigital && priceInfo.physicalVatAtCustoms}
					<div class="flex justify-between items-center">
						<div class="flex flex-col">
							<h3 class="text-base flex flex-row gap-2 items-center">
								{t('product.vatExcluded')}
								<div title={t('cart.vatNullOutsideSellerCountry')}>
									<IconInfo class="cursor-pointer" />
								</div>
							</h3>
						</div>
					</div>
				{/if}

				{#each priceInfo.vat as vat}
					<div class="flex justify-between items-center">
						<div class="flex flex-col">
							<h3 class="text-base flex flex-row gap-2 items-center">
								{t('cart.vat')} ({vat.rate}%)
								<div
									title="{t('cart.vatRate', {
										country: countryName(vat.country)
									})}. {priceInfo.singleVatCountry
										? t('cart.vatSellerCountry')
										: !isDigital
										? `${t('checkout.vatShippingAddress')}`
										: `${t('cart.vatIpCountryText', { link: 'https://lite.ip2location.com' })}`}"
								>
									<IconInfo class="cursor-pointer" />
								</div>
							</h3>
						</div>

						<div class="flex flex-col ml-auto items-end justify-center">
							<PriceTag
								class="text-2xl truncate"
								amount={vat.partialPrice.amount}
								currency={vat.partialPrice.currency}
								main
							/>
							<PriceTag
								amount={vat.partialPrice.amount}
								currency={vat.partialPrice.currency}
								class="text-base truncate"
								secondary
							/>
						</div>
					</div>
					<div class="border-b border-gray-300 col-span-4" />
				{/each}

				<span class="py-1" />

				<div class="-mx-3 p-3 flex flex-col">
					<div class="flex justify-between">
						<span class="text-xl">{t('cart.total')}</span>
						<PriceTag
							class="text-2xl"
							amount={priceInfo.partialPriceWithVat}
							currency={UNDERLYING_CURRENCY}
							main
						/>
					</div>
					<PriceTag
						class="self-end"
						amount={priceInfo.partialPriceWithVat}
						currency={UNDERLYING_CURRENCY}
						secondary
					/>
				</div>
				{#if priceInfo.totalPriceWithVat !== priceInfo.partialPriceWithVat}
					<div class="-mx-3 p-3 flex flex-col">
						<div class="flex justify-between">
							<span class="text-xl flex gap-1 items-center flex-wrap"
								>{t('cart.remaining')}<span title={t('cart.remainingHelpText')}>
									<IconInfo class="cursor-pointer" />
								</span></span
							>
							<PriceTag
								class="text-2xl"
								amount={priceInfo.totalPriceWithVat - priceInfo.partialPriceWithVat}
								currency={priceInfo.currency}
								main
							/>
						</div>
						<PriceTag
							class="self-end"
							amount={priceInfo.totalPriceWithVat - priceInfo.partialPriceWithVat}
							currency={priceInfo.currency}
							secondary
						/>
					</div>
				{/if}

				<label class="checkbox-label">
					<input type="checkbox" class="form-checkbox" name="teecees" form="checkout" required />
					<span>
						<Trans key="checkout.tosAgree"
							><a
								href="/terms"
								target="_blank"
								class="body-hyperlink hover:underline"
								slot="0"
								let:translation
							>
								{translation}
							</a></Trans
						>
					</span>
				</label>

				{#if data.collectIPOnDeliverylessOrders && isDigital}
					<label class="checkbox-label">
						<input
							type="checkbox"
							class="form-checkbox"
							name="allowCollectIP"
							form="checkout"
							required
						/>
						<span>
							<Trans key="checkout.agreeIpCollect"
								><a
									href="/why-collect-ip"
									target="_blank"
									class="body-hyperlink hover:underline"
									slot="0"
									let:translation>{translation}</a
								></Trans
							>
						</span>
					</label>
				{/if}
				{#if priceInfo.totalPriceWithVat !== priceInfo.partialPriceWithVat}
					<label class="checkbox-label">
						<input
							type="checkbox"
							class="form-checkbox"
							name="isOnlyDeposit"
							form="checkout"
							required
						/>
						<span>
							<Trans key="checkout.agreeOnlyDeposit"
								><a
									href="/why-pay-remainder"
									target="_blank"
									class="body-hyperlink hover:underline"
									slot="0"
									let:translation>{translation}</a
								></Trans
							>
						</span>
					</label>
				{/if}
				{#if data.vatCountry !== country && priceInfo.physicalVatAtCustoms && !isDigital}
					<label class="checkbox-label">
						<input
							type="checkbox"
							class="form-checkbox"
							name="isVATNullForeigner"
							form="checkout"
							required
						/>

						<span>
							<Trans key="checkout.agreeNullVatForeigner"
								><a
									href="/why-vat-customs"
									target="_blank"
									class="body-hyperlink hover:underline"
									slot="0"
									let:translation>{translation}</a
								></Trans
							>
						</span>
					</label>
				{/if}

				{#if data.roleId === POS_ROLE_ID}
					{#if !data.vatExempted}
						<label class="checkbox-label">
							<input
								type="checkbox"
								class="form-checkbox"
								bind:checked={isFreeVat}
								name="isFreeVat"
								form="checkout"
							/>
							<span>
								<Trans key="pos.vatFree"
									><a
										href="/terms"
										target="_blank"
										class="body-hyperlink hover:underline"
										slot="0"
										let:translation
									>
										{translation}
									</a></Trans
								>
							</span>
						</label>

						{#if isFreeVat}
							<label class="form-label col-span-3">
								{t('pos.vatFreeReason')}:
								<input
									type="text"
									class="form-input"
									form="checkout"
									name="reasonFreeVat"
									required
								/>
							</label>
						{/if}
					{/if}
					<label class="checkbox-label">
						<input
							type="checkbox"
							class="form-checkbox"
							bind:checked={addDiscount}
							name="addDiscount"
							form="checkout"
						/>
						<span>
							<Trans key="pos.applyGiftDiscount">
								<a
									href="/gift-discount"
									target="_blank"
									class="body-hyperlink hover:underline"
									slot="0"
									let:translation
								>
									{translation}
								</a>
							</Trans>
						</span>
					</label>

					{#if addDiscount}
						<input
							type="number"
							class="form-input"
							name="discountAmount"
							placeholder="Ex: 10"
							form="checkout"
							step="any"
							bind:value={discountAmount}
							min="0"
							required
						/>

						<select
							name="discountType"
							bind:value={discountType}
							class="form-input"
							form="checkout"
							required
						>
							<option value="fiat">{data.currencies.main}</option>
							<option value="percentage">%</option>
						</select>

						{#if discountAmount && !isDiscountValid}
							<p class="text-sm text-red-600">{t('pos.invalidDiscount')}</p>
						{/if}
						<label class="checkbox-labe col-span-3">
							<input
								type="checkbox"
								class="form-checkbox"
								form="checkout"
								name="offerOrder"
								bind:checked={offerOrder}
							/>
							{t('pos.offerOrder')}
						</label>
						<label class="form-label col-span-3">
							{t('pos.discountJustification')}
							<input
								type="text"
								class="form-input"
								form="checkout"
								name="discountJustification"
								required
							/>
						</label>
					{/if}
					{#if data.deliveryFees.allowFreeForPOS && deliveryFees}
						<label class="checkbox-label">
							<input
								type="checkbox"
								class="form-checkbox"
								name="offerDeliveryFees"
								form="checkout"
								bind:checked={offerDeliveryFees}
							/>
							{t('pos.offerDeliveryFees')}
						</label>

						{#if offerDeliveryFees}
							<label class="form-label col-span-3">
								{t('pos.discountJustification')}
								<input
									type="text"
									class="form-input"
									form="checkout"
									name="reasonOfferDeliveryFees"
									required
									value={onLocation ? t('checkout.reasonOfferFeesDefault') : ''}
								/></label
							>
						{/if}
					{/if}
				{/if}

				<input
					type="submit"
					class="btn body-cta body-mainCTA btn-xl -mx-1 -mb-1 mt-1"
					value={t('checkout.cta.submit')}
					form="checkout"
					disabled={isNaN(deliveryFees) || (addDiscount && !isDiscountValid) || submitting}
				/>
			</article>
		</div>
	</div>
	{#if data.cmsCheckoutBottom && data.cmsCheckoutBottomData}
		<CmsDesign
			challenges={data.cmsCheckoutBottomData.challenges}
			tokens={data.cmsCheckoutBottomData.tokens}
			sliders={data.cmsCheckoutBottomData.sliders}
			products={data.cmsCheckoutBottomData.products}
			pictures={data.cmsCheckoutBottomData.pictures}
			tags={data.cmsCheckoutBottomData.tags}
			digitalFiles={data.cmsCheckoutBottomData.digitalFiles}
			roleId={data.roleId ? data.roleId : ''}
			specifications={data.cmsCheckoutBottomData.specifications}
			contactForms={data.cmsCheckoutBottomData.contactForms}
			pageName={data.cmsCheckoutBottom.title}
			websiteLink={data.websiteLink}
			brandName={data.brandName}
			sessionEmail={data.email}
			countdowns={data.cmsCheckoutBottomData.countdowns}
			galleries={data.cmsCheckoutBottomData.galleries}
			leaderboards={data.cmsCheckoutBottomData.leaderboards}
			class={data.hideCmsZonesOnMobile ? 'hidden lg:contents' : ''}
		/>
	{/if}
</main>
