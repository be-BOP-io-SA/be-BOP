<script lang="ts">
	import {
		CURRENCY_UNIT,
		computePriceForStorage,
		sortCurrencies,
		currenciesToSelectOptions
	} from '$lib/types/Currency';
	import {
		DEFAULT_MAX_QUANTITY_PER_ORDER,
		MAX_NAME_LIMIT,
		MAX_SHORT_DESCRIPTION_LIMIT,
		type Product
	} from '$lib/types/Product';
	import type { Tag } from '$lib/types/Tag';
	import { upperFirst } from '$lib/utils/upperFirst';
	import type { WithId } from 'mongodb';
	import { MultiSelect } from 'svelte-multiselect';
	import Select from 'svelte-select';
	import type { LayoutServerData } from '../../routes/(app)/$types';
	import DeliveryFeesSelector from './DeliveryFeesSelector.svelte';
	import CurrencyLabel from './CurrencyLabel.svelte';
	import PriceFieldsWithVat from './PriceFieldsWithVat.svelte';
	import Editor from '@tinymce/tinymce-svelte';
	import { MAX_CONTENT_LIMIT } from '$lib/types/CmsPage';
	import {
		TINYMCE_PLUGINS,
		TINYMCE_TOOLBAR
	} from '../../routes/(app)/admin[[hash=admin_hash]]/cms/tinymce-plugins';
	import { generateId } from '$lib/utils/generateId';
	import { applyAction, deserialize } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { ProductActionSettings } from '$lib/types/ProductActionSettings';
	import { preUploadPicture } from '$lib/types/Picture';
	import { currencies } from '$lib/stores/currencies';
	import { page } from '$app/stores';
	import type { PojoObject } from '$lib/server/pojo';
	import type { PaymentMethod } from '$lib/server/payment-methods';
	import { useI18n } from '$lib/i18n';
	import { typedFromEntries } from '$lib/utils/typedFromEntries';
	import { type Day, dayList, productToScheduleId, type BookingSummary } from '$lib/types/Schedule';
	import { formatDuration } from '$lib/utils/formatDuration';
	import { formatDistance } from 'date-fns';
	import { computeVatRate } from '$lib/utils/vat';
	import {
		SUBSCRIPTION_DURATIONS,
		subscriptionUnitToSeconds
	} from '$lib/types/SubscriptionDuration';

	const MAX_PHASE_REMINDER_SECONDS = 7 * 24 * 60 * 60;

	const { t, formatDistanceLocale } = useI18n();

	export let tags: Pick<Tag, '_id' | 'name'>[];
	export let isNew = false;
	export let duplicateFromId: string | undefined = undefined;
	export let sold = 0;
	export let reserved = 0;
	export let scanned = 0;
	export let globalDeliveryFees: LayoutServerData['deliveryFees'];
	export let adminPrefix: string;
	export let vatProfiles: LayoutServerData['vatProfiles'];
	export let defaultActionSettings: ProductActionSettings;
	export let availablePaymentMethods: PaymentMethod[];
	export let productsWithStock: { _id: string; name: string }[] = [];
	export let currentBookings: BookingSummary[] = [];
	export let upcomingBookings: BookingSummary[] = [];

	export let product: WithId<PojoObject<Product>> = {
		_id: '',
		payWhatYouWant: false,
		standalone: false,
		type: '' as Product['type'],
		preorder: false,
		name: '',
		shipping: false,
		isTicket: false,
		bookingSpec: undefined,
		price: {
			amount: 0,
			currency: $currencies.priceReference
		},
		alias: [],
		vatProfileId: undefined,
		availableDate: undefined,
		displayShortDescription: false,
		free: false,
		hideDiscountExpiration: false,
		stock: undefined,
		maxQuantityPerOrder: DEFAULT_MAX_QUANTITY_PER_ORDER,
		actionSettings: defaultActionSettings,
		createdAt: new Date(),
		updatedAt: new Date(),
		shortDescription: '',
		description: '',
		mobile: {
			hideContentBefore: false,
			hideContentAfter: false
		},

		hasVariations: false,
		hasSellDisclaimer: false,
		hideFromSEO: false
	};

	let paymentMethods = product.paymentMethods || [...availablePaymentMethods];
	let restrictPaymentMethods = !!product.paymentMethods;
	let vatProfileId = product.vatProfileId || '';
	let subscriptionDuration = product.subscriptionDuration || '';
	let subscriptionReminderSeconds: number | '' = product.subscriptionReminderSeconds || '';
	let pricingSchedule: NonNullable<Product['pricingSchedule']> = (
		product.pricingSchedule ?? []
	).map((p) => ({ ...p }));
	function addPricingPhase() {
		pricingSchedule = [
			...pricingSchedule,
			{ value: 1, unit: 'month', priceAmount: 0, reminderValue: 7, reminderUnit: 'day' }
		];
	}
	function removePricingPhase(i: number) {
		pricingSchedule = pricingSchedule.filter((_, idx) => idx !== i);
	}
	function movePricingPhase(i: number, dir: -1 | 1) {
		const j = i + dir;
		if (j < 0 || j >= pricingSchedule.length) {
			return;
		}
		const copy = [...pricingSchedule];
		[copy[i], copy[j]] = [copy[j], copy[i]];
		pricingSchedule = copy;
	}
	let formElement: HTMLFormElement;
	let variationInput: HTMLInputElement[] = [];
	let disableDateChange = !isNew;
	let displayPreorderCustomText = !!product.customPreorderText;
	let hasStock = !!product.stock;
	let allowDeposit = !!product.deposit;
	let submitting = false;
	let sellDisclaimerTitle = product.sellDisclaimer?.title || '';
	let sellDisclaimerReason = product.sellDisclaimer?.reason || '';
	let files: FileList | null = null;
	let deposit = product.deposit || {
		percentage: 50,
		enforce: false
	};
	let errorMessage = '';
	let variationLines = product.variations?.length ? product.variations?.length : 2;
	let productCtaLines = product.cta?.length ? product.cta.length : 3;
	let externalResourcesLines = product.externalResources?.length
		? product.externalResources?.length
		: 3;
	let displayRawHTMLBefore = false;
	let displayRawHTMLAfter = false;

	let priceVatExcluded = product.price.amount;

	// Currency options for Select component (sorted: priceRef → main → secondary → BTC/SAT → fiat A-Z)
	const sortedCurrencies = sortCurrencies(
		$currencies.priceReference,
		$currencies.main,
		$currencies.secondary
	);
	const allCurrenciesOptions = currenciesToSelectOptions(sortedCurrencies);
	let selectedCurrency =
		allCurrenciesOptions.find((c) => c.value === product.price.currency) || null;
	let currency: import('$lib/types/Currency').Currency = product.price.currency;
	$: if (selectedCurrency) {
		currency = selectedCurrency.value;
	}

	$: vatRate = computeVatRate({
		productVatProfileId: vatProfileId || undefined,
		vatProfiles,
		bebopCountry: $page.data.vatCountry,
		userCountry: $page.data.vatCountry,
		vatSingleCountry: true
	});
	$: vatProfileLabel =
		vatProfiles.find((p) => p._id === vatProfileId)?.name ??
		t('admin.productForm.noCustomVatProfile');

	$: product.price = computePriceForStorage(priceVatExcluded, currency);

	if (product._id && isNew) {
		product.name = product.name + t('admin.productForm.duplicateSuffix');
		product._id = generateId(product.name, false);
	}

	async function checkForm(event: SubmitEvent) {
		submitting = true;
		errorMessage = '';
		// Need to load here, or for some reason, some inputs disappear afterwards
		const formData = new FormData(formElement);

		// --- Cleaining empty variationLabels ---
		const keysToDelete = [];
		for (const [key, value] of formData.entries()) {
			if (key.startsWith('variationLabels.') && typeof value === 'string' && value.trim() === '') {
				keysToDelete.push(key);
			}
		}
		keysToDelete.forEach((key) => {
			formData.delete(key);
		});
		//--- end

		const priceAmountInput = formElement.querySelector<HTMLInputElement>(
			'input[name="priceAmount"]'
		);
		try {
			if (
				priceAmountInput &&
				priceAmountInput.value &&
				+priceAmountInput.value < CURRENCY_UNIT[product.price.currency] &&
				!product.payWhatYouWant &&
				!product.free
			) {
				if (
					parseInt(priceAmountInput.value) === 0 &&
					!confirm(t('admin.productForm.confirmSaveAsFreeProduct'))
				) {
					priceAmountInput.setCustomValidity(
						t('admin.productForm.priceMustBeGreaterThanOrEqualTo', {
							minimum: CURRENCY_UNIT[product.price.currency],
							currency: product.price.currency
						})
					);
					priceAmountInput.reportValidity();
					event.preventDefault();
					return;
				}
			} else if (priceAmountInput) {
				priceAmountInput.setCustomValidity('');
			}

			const seen = new Set<string>();
			for (const [i, value] of variationLabelsValues.entries()) {
				const key = JSON.stringify(
					`${variationLabelsNames[i] || product.variations?.[i].name}, ${
						value || product.variations?.[i].value
					}`
				).toLowerCase();

				if (seen.has(key)) {
					variationInput[i].setCustomValidity(
						t('admin.productForm.duplicateVariationsFound', { key })
					);
					variationInput[i].reportValidity();
					event.preventDefault();
					return;
				}
				seen.add(key);
			}
			if (!duplicateFromId && isNew) {
				if (!files) {
					errorMessage = t('admin.productForm.pleaseUploadAPicture');
					return;
				}
				let index = 0;
				for (const file of files) {
					const pictureId = await preUploadPicture(adminPrefix, file, {
						fileName: `${product.name}-${index}`
					});

					formData.set(`pictureIds[${index}]`, pictureId);
					index++;
				}
			}

			const action = (event.submitter as HTMLButtonElement | null)?.formAction.includes('?/')
				? (event.submitter as HTMLButtonElement).formAction
				: formElement.action;

			const finalResponse = await fetch(action, {
				method: 'POST',
				body: formData
			});

			const result = deserialize(await finalResponse.text());

			if (result.type === 'success') {
				// rerun all `load` functions, following the successful update
				await invalidateAll();
			}
			if (result.type === 'error') {
				errorMessage = result.error.message;
				return;
			}

			applyAction(result);
		} finally {
			submitting = false;
		}
	}
	let hasMaximumPrice = !!product.maximumPrice;
	let hasBooking = !!product.bookingSpec;
	let existingScheduleId =
		!!product.bookingSpec && !isNew ? productToScheduleId(product._id) : undefined;
	let availableDateStr = product.availableDate?.toJSON().slice(0, 10);

	let bookingSpec: NonNullable<Product['bookingSpec']> = product.bookingSpec || {
		slotMinutes: 15,
		schedule: {
			timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
			monday: {
				start: '09:00',
				end: '18:00'
			},
			tuesday: {
				start: '09:00',
				end: '18:00'
			},
			wednesday: {
				start: '09:00',
				end: '18:00'
			},
			thursday: {
				start: '09:00',
				end: '18:00'
			},
			friday: {
				start: '09:00',
				end: '18:00'
			},
			saturday: null,
			sunday: null
		}
	};
	// Default the same-day cutoff hour whenever the operator turns the option on, so the bound
	// `<input type="time">` has a value to display from the first reactive cycle.
	$: if (bookingSpec.allowSameDayBooking && !bookingSpec.sameDayBookingMaxHour) {
		bookingSpec.sameDayBookingMaxHour = '14:00';
	}
	let days = typedFromEntries(
		dayList.map((day) => [
			day,
			{
				start: bookingSpec.schedule[day]?.start ?? '',
				end: bookingSpec.schedule[day]?.end ?? ''
			}
		])
	) as Record<Day, { start: string; end: string }>;
	let bookingSpecSlotOptions = [
		{ value: 15, label: t('admin.productForm.duration15Minutes') },
		{ value: 30, label: t('admin.productForm.duration30Minutes') },
		{ value: 60, label: t('admin.productForm.duration1Hour') },
		{ value: 120, label: t('admin.productForm.duration2Hours') },
		{ value: 60 * 24, label: t('admin.productForm.allDay') }
	];
	$: changedDate = availableDateStr !== product.availableDate?.toJSON().slice(0, 10);
	$: enablePreorder = availableDateStr && availableDateStr > new Date().toJSON().slice(0, 10);

	$: if (!enablePreorder) {
		product.preorder = false;
	}

	$: if (!availableDateStr) {
		availableDateStr = undefined;
		product.availableDate = undefined;
	}

	$: if (product.type === 'subscription') {
		product.payWhatYouWant = false;
	}

	$: if (product.payWhatYouWant) {
		product.standalone = true;
	}

	$: if (product.free) {
		allowDeposit = false;
	}

	$: if (allowDeposit && !deposit) {
		deposit = {
			percentage: 50,
			enforce: false
		};
	}

	function confirmDelete(event: Event) {
		if (!confirm(t('admin.productForm.confirmDeleteProduct'))) {
			event.preventDefault();
		}
	}
	let variationLabelsNames: string[] = [];
	let variationLabelsValues: string[] = [];
	function isNumber(value: string) {
		return !isNaN(Number(value)) && value.trim() !== '';
	}
	$: variationLabelsToUpdate = product.variationLabels || { names: {}, values: {} };
	function deleteVariationLabel(key: string, valueKey: string) {
		variationLabelsToUpdate = {
			...variationLabelsToUpdate,
			values: {
				...variationLabelsToUpdate?.values,
				[key]: {
					...variationLabelsToUpdate?.values[key]
				}
			}
		};
		delete variationLabelsToUpdate?.values[key][valueKey];
		variationLines -= 1;
		product.variations = product.variations?.filter(
			(vari) => !(key === vari.name && valueKey === vari.value)
		);
		if (Object.keys(variationLabelsToUpdate?.values[key] || []).length === 0) {
			delete variationLabelsToUpdate?.names[key];
			delete variationLabelsToUpdate?.values[key];
		}
	}
</script>

<form
	method="post"
	class="flex flex-col gap-6"
	action={isNew ? (duplicateFromId ? '?/duplicate' : '?/add') : `?/update`}
	bind:this={formElement}
	on:submit|preventDefault={checkForm}
	inert={submitting}
>
	<fieldset class="contents" disabled={submitting}>
		<!-- Essential Information - Always Visible -->
		<div class="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
			<h2 class="text-xl font-semibold text-gray-900 mb-4 flex items-center">
				{t('admin.productForm.essentialInformation')}
			</h2>

			<div class="space-y-4">
				<label class="w-full">
					<span class="text-red-500">*</span>
					{t('admin.productForm.productName')}
					<input
						class="form-input"
						type="text"
						maxlength={MAX_NAME_LIMIT}
						name="name"
						placeholder={t('admin.productForm.enterProductName')}
						bind:value={product.name}
						on:change={isNew ? () => (product._id = generateId(product.name, false)) : undefined}
						on:input={isNew ? () => (product._id = generateId(product.name, false)) : undefined}
						required
					/>
				</label>

				<label class="block w-full" class:text-gray-450={!isNew}>
					<span class="text-red-500">*</span>
					{t('admin.productForm.productType')}
					<select
						class="form-input"
						class:text-gray-450={!isNew}
						disabled={!isNew}
						bind:value={product.type}
						name="type"
						required
					>
						{#if isNew && !product.type}
							<option value="" disabled selected>{t('admin.productForm.selectType')}</option>
						{/if}
						{#each ['resource', 'subscription', 'donation'] as type}
							<option value={type}>{upperFirst(type)}</option>
						{/each}
					</select>
					{#if !isNew}
						<p class="text-sm text-gray-500 mt-1">
							{t('admin.productForm.cannotBeChangedAfterCreation')}
						</p>
					{/if}
				</label>

				{#if product.type === 'subscription'}
					<label class="form-label">
						{t('admin.productForm.subscriptionDurationLabel')}
						<select
							name="subscriptionDuration"
							class="form-input max-w-[25rem]"
							bind:value={subscriptionDuration}
						>
							<option value="">{t('admin.productForm.defaultShopWide')}</option>
							{#each SUBSCRIPTION_DURATIONS as duration}
								<option value={duration}>{duration}</option>
							{/each}
						</select>
					</label>
					<label class="form-label">
						{t('admin.productForm.subscriptionReminder')}
						<select
							name="subscriptionReminderSeconds"
							class="form-input max-w-[25rem]"
							bind:value={subscriptionReminderSeconds}
						>
							<option value="">{t('admin.productForm.defaultShopWide')}</option>
							{#each [86400 * 7, 86400 * 3, 86400, 3600, 5 * 60] as seconds}
								<option value={seconds}
									>{t('admin.config.beforeEndOfSubscription', {
										duration: formatDistance(0, seconds * 1000, { locale: formatDistanceLocale() })
									})}</option
								>
							{/each}
						</select>
					</label>
				{/if}

				<label class="w-full block">
					<CurrencyLabel label={t('admin.productForm.priceCurrency')} />
					<Select
						items={allCurrenciesOptions}
						searchable={true}
						clearable={false}
						bind:value={selectedCurrency}
						class="form-input"
					/>
					<input type="hidden" name="priceCurrency" value={selectedCurrency?.value || ''} />
				</label>

				{#if vatProfiles.length}
					<label class="form-label">
						{t('admin.productForm.vatProfile')}
						<select name="vatProfileId" class="form-input" bind:value={vatProfileId}>
							<option value="">{t('admin.productForm.noCustomVatProfile')}</option>
							{#each vatProfiles as profile}
								<option value={profile._id}>{profile.name}</option>
							{/each}
						</select>
					</label>
				{/if}

				<PriceFieldsWithVat
					bind:priceVatExcluded
					{currency}
					{vatRate}
					{vatProfileLabel}
					disabled={product.free}
				/>

				{#if isNew && !duplicateFromId}
					<label class="form-label">
						<span class="text-red-500">*</span>
						{t('admin.productForm.productImages')}
						<input
							type="file"
							accept="image/jpeg,image/png,image/webp"
							class="form-input file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
							bind:files
							required
							multiple
						/>
						<p class="text-sm text-gray-500 mt-1">
							{t('admin.productForm.uploadProductImages')}
						</p>
					</label>
				{/if}
			</div>
		</div>

		<!-- Basic Settings - Collapsible -->
		<details class="bg-white border border-gray-200 rounded-lg shadow-sm">
			<summary
				class="p-4 cursor-pointer hover:bg-gray-50 rounded-lg font-medium text-gray-900 flex items-center"
			>
				<svg
					class="w-5 h-5 mr-2 transition-transform"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M19 9l-7 7-7-7"
					/>
				</svg>
				{t('admin.productForm.basicSettings')}
			</summary>
			<div class="p-4 pt-0 space-y-4">
				<div class="gap-4 flex flex-col md:flex-row">
					<label class="form-label w-full" class:text-gray-450={!isNew}>
						{t('admin.productForm.slug')}
						<input
							class="form-input"
							class:text-gray-450={!isNew}
							type="text"
							name="slug"
							placeholder={t('admin.productForm.slug')}
							bind:value={product._id}
							title={t('admin.productForm.slugTitle')}
							required
							disabled={!isNew}
						/>
						{#if !isNew}
							<p class="text-sm text-gray-500 mt-1">
								{t('admin.productForm.cannotBeChangedAfterCreation')}
							</p>
						{/if}
					</label>
					<label class="form-label w-full">
						{t('admin.productForm.alias')}
						<input
							class="form-input"
							type="text"
							name="alias"
							placeholder={t('admin.productForm.optionalAlias')}
							step="any"
							value={duplicateFromId ? '' : product.alias?.[1] ?? ''}
						/>
					</label>
				</div>

				<label class="form-label">
					{t('admin.productForm.shortDescription')}
					<textarea
						name="shortDescription"
						cols="30"
						rows="2"
						maxlength={MAX_SHORT_DESCRIPTION_LIMIT}
						value={product.shortDescription}
						class="form-input"
						placeholder={t('admin.productForm.briefDescriptionPlaceholder')}
					/>
				</label>

				<label class="form-label">
					{t('admin.productForm.description')}
					<textarea
						name="description"
						cols="30"
						rows="4"
						maxlength="10000"
						class="form-input"
						value={product.description}
						placeholder={t('admin.productForm.detailedDescriptionPlaceholder')}
					/>
				</label>

				<!-- svelte-ignore a11y-label-has-associated-control -->
				<label class="form-label">
					{t('admin.productForm.productTags')}
					<MultiSelect
						--sms-options-bg="var(--body-mainPlan-backgroundColor)"
						name="tagIds"
						options={tags.map((tag) => ({
							value: tag._id,
							label: tag.name
						}))}
						selected={product.tagIds?.map((tagId) => ({
							value: tagId,
							label: tags.find((tag) => tag._id === tagId)?.name ?? tagId
						})) ?? []}
					/>
				</label>

				<label class="checkbox-label">
					<input
						class="form-checkbox"
						type="checkbox"
						name="displayShortDescription"
						bind:checked={product.displayShortDescription}
					/>
					{t('admin.productForm.displayShortDescriptionOnProductPage')}
				</label>
			</div>
		</details>

		<!-- Pricing Options - Collapsible -->
		<details class="bg-white border border-gray-200 rounded-lg shadow-sm">
			<summary
				class="p-4 cursor-pointer hover:bg-gray-50 rounded-lg font-medium text-gray-900 flex items-center"
			>
				<svg
					class="w-5 h-5 mr-2 transition-transform"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M19 9l-7 7-7-7"
					/>
				</svg>
				{t('admin.productForm.pricingOptions')}
			</summary>
			<div class="p-4 pt-0 space-y-4">
				<label class="checkbox-label">
					<input class="form-checkbox" type="checkbox" bind:checked={product.free} name="free" />
					{t('admin.productForm.thisIsAFreeProduct')}
				</label>

				<label class="checkbox-label">
					<input
						class="form-checkbox"
						type="checkbox"
						bind:checked={product.standalone}
						name="standalone"
						disabled={product.payWhatYouWant}
					/>
					{t('admin.productForm.thisIsAStandaloneProduct')}
				</label>

				<label class="checkbox-label">
					<input
						class="form-checkbox"
						type="checkbox"
						bind:checked={product.payWhatYouWant}
						name="payWhatYouWant"
						disabled={product.type === 'subscription'}
					/>
					{t('admin.productForm.thisIsAPayWhatYouWantProduct')}
				</label>

				{#if product.payWhatYouWant}
					<div class="bg-blue-50 p-4 rounded-lg space-y-3">
						<div class="gap-4 flex flex-col md:flex-row">
							<label class="w-full">
								{t('admin.productForm.recommendedPriceAmount')}
								<input
									class="form-input"
									type="number"
									name="recommendedPWYWAmount"
									placeholder={t('admin.productVatCalcRow.pricePlaceholder')}
									step="any"
									value={(product.recommendedPWYWAmount ?? 0)
										.toLocaleString('en', { maximumFractionDigits: 8 })
										.replace(/,/g, '')}
								/>
							</label>
							<label class="w-full">
								{t('admin.productForm.recommendedPriceCurrency')}
								<select
									name="maxPriceCurrency"
									class="form-input"
									bind:value={product.price.currency}
									disabled
								>
									{#each sortedCurrencies as currency}
										<option value={currency}>{currency}</option>
									{/each}
								</select>
							</label>
						</div>
						<label class="checkbox-label">
							<input
								class="form-checkbox"
								type="checkbox"
								bind:checked={hasMaximumPrice}
								name="hasMaximumPrice"
								disabled={product.type === 'subscription'}
							/>
							{t('admin.productForm.thisArticleHasAMaximumPrice')}
						</label>
						{#if hasMaximumPrice}
							<div class="gap-4 flex flex-col md:flex-row">
								<label class="w-full">
									{t('admin.productForm.maximumPriceAmount')}
									<input
										class="form-input"
										type="number"
										name="maxPriceAmount"
										placeholder={t('admin.productVatCalcRow.pricePlaceholder')}
										step="any"
										min={product.price.amount}
										value={product.maximumPrice?.amount
											.toLocaleString('en', { maximumFractionDigits: 8 })
											.replace(/,/g, '')}
										required
									/>
								</label>
								<label class="w-full">
									{t('admin.productForm.priceCurrency')}
									<select
										name="maxPriceCurrency"
										class="form-input"
										bind:value={product.price.currency}
										disabled
									>
										{#each sortedCurrencies as currency}
											<option value={currency}>{currency}</option>
										{/each}
									</select>
								</label>
							</div>
						{/if}
					</div>
				{/if}

				<label class="checkbox-label">
					<input class="form-checkbox" type="checkbox" bind:checked={allowDeposit} />
					{t('admin.productForm.allowPartialDeposit')}
				</label>

				{#if allowDeposit}
					<div class="bg-green-50 p-4 rounded-lg space-y-3">
						<label class="form-label">
							{t('admin.productForm.depositPercentageOfTotalPrice')}
							<input
								class="form-input"
								type="number"
								name="depositPercentage"
								placeholder={t('admin.productForm.deposit')}
								step="1"
								min="0"
								max="100"
								bind:value={deposit.percentage}
								required
							/>
						</label>
						<label class="checkbox-label">
							<input
								class="form-checkbox"
								type="checkbox"
								bind:checked={deposit.enforce}
								name="enforceDeposit"
							/>
							{t('admin.productForm.enforceDepositDescription')}
						</label>
					</div>
				{/if}

				<label class="checkbox-label">
					<input
						class="form-checkbox"
						type="checkbox"
						bind:checked={restrictPaymentMethods}
						name="restrictPaymentMethods"
					/>
					{t('admin.productForm.restrictPaymentMethods')}
				</label>

				{#if restrictPaymentMethods}
					<div class="bg-yellow-50 p-4 rounded-lg space-y-2">
						<p class="text-sm font-medium text-gray-700">
							{t('admin.productForm.allowedPaymentMethods')}
						</p>
						{#each availablePaymentMethods as method}
							<label class="checkbox-label">
								<input
									class="form-checkbox"
									type="checkbox"
									name="paymentMethods"
									value={method}
									checked={paymentMethods?.includes(method)}
								/>
								{t('checkout.paymentMethod.' + method)}
								{method === 'point-of-sale'
									? t('admin.productForm.onlyAvailableForPosEmployees')
									: ''}
							</label>
						{/each}
					</div>
				{/if}

				<label class="checkbox-label">
					<input
						class="form-checkbox"
						type="checkbox"
						bind:checked={product.hasVariations}
						name="hasVariations"
						disabled={!product.standalone}
					/>
					{t('admin.productForm.productHasLightVariations')}
				</label>

				{#if product.hasVariations}
					<div class="bg-purple-50 p-4 rounded-lg space-y-3">
						<p class="text-sm font-medium text-gray-700">
							{t('admin.productForm.productVariations')}
						</p>
						{#each [...(product.variations || []), ...Array(variationLines).fill( { name: '', value: '', price: 0 } )].slice(0, variationLines) as variation, i}
							<div class="flex gap-4 items-end">
								{#if variation.name && variation.value}
									<label class="form-label flex-1">
										{t('admin.productForm.categoryId')}
										<input disabled type="text" class="form-input" value={variation.name} />
									</label>
									<label class="form-label flex-1">
										{t('admin.productForm.categoryName')}
										<input
											type="text"
											name="variationLabels.names[{variation.name}]"
											class="form-input"
											value={product.variationLabels?.names[variation.name]}
											required={!!product.variationLabels?.values[variation.name]?.[
												variation.value
											]}
										/>
									</label>
									<label class="form-label flex-1">
										{t('admin.productForm.value')}
										<input
											type="text"
											name="variationLabels.values[{variation.name}][{variation.value}]"
											class="form-input"
											value={product.variationLabels?.values[variation.name]?.[variation.value]}
											bind:this={variationInput[i]}
											on:input={() => variationInput[i]?.setCustomValidity('')}
											required={!!product.variationLabels?.names[variation.name]}
										/>
									</label>
								{:else}
									<label class="form-label flex-1">
										{t('admin.productForm.categoryName')}
										<input
											type="text"
											name="variationLabels.names[{(
												(isNumber(variationLabelsNames[i]) ? 'name' : '') +
													variationLabelsNames[i] || ''
											).toLowerCase()}]"
											class="form-input"
											bind:value={variationLabelsNames[i]}
											required={!!variationLabelsValues[i]}
											placeholder={t('admin.productForm.category')}
										/>
									</label>
									<label class="form-label flex-1">
										{t('admin.productForm.value')}
										<input
											type="text"
											name="variationLabels.values[{(
												(isNumber(variationLabelsNames[i]) ? 'name' : '') +
													variationLabelsNames[i] || ''
											).toLowerCase()}][{isNumber(variationLabelsValues[i])
												? (
														variationLabelsNames[i] +
															(isNumber(variationLabelsNames[i]) ? '-' : '') +
															variationLabelsValues[i] || ''
												  ).toLowerCase()
												: (variationLabelsValues[i] || '').toLowerCase()}]"
											class="form-input"
											bind:value={variationLabelsValues[i]}
											bind:this={variationInput[i]}
											on:input={() => variationInput[i]?.setCustomValidity('')}
											required={!!variationLabelsNames[i]}
											placeholder={t('admin.productForm.value')}
										/>
									</label>
								{/if}

								<label class="form-label">
									{#if variation.name && variation.value}
										<input type="hidden" name="variations[{i}].name" value={variation.name} />
										<input type="hidden" name="variations[{i}].value" value={variation.value} />
									{:else}
										<input
											type="hidden"
											name="variations[{i}].name"
											value={(
												(isNumber(variationLabelsNames[i]) ? 'name' : '') +
													variationLabelsNames[i] || ''
											).toLowerCase()}
										/>
										<input
											type="hidden"
											name="variations[{i}].value"
											value={isNumber(variationLabelsValues[i])
												? (
														variationLabelsNames[i] +
															(isNumber(variationLabelsNames[i]) ? '-' : '') +
															variationLabelsValues[i] || ''
												  ).toLowerCase()
												: (variationLabelsValues[i] || '').toLowerCase()}
										/>
									{/if}
									{t('admin.productForm.priceDifference')}
									<input
										type="number"
										name="variations[{i}].price"
										class="form-input"
										value={variation.price}
										min="0"
										step="any"
										placeholder="0.00"
									/>
								</label>

								{#if variation.name && variation.value}
									<button
										type="button"
										class="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md"
										on:click={() => deleteVariationLabel(variation.name, variation.value)}
									>
										🗑️
									</button>
								{/if}
							</div>
						{/each}
						<button
							class="btn body-mainCTA self-start"
							on:click={() => (variationLines += 1)}
							type="button"
						>
							{t('admin.productForm.addVariation')}
						</button>
					</div>
				{/if}

				{#if product.type === 'subscription'}
					<div class="border-t border-gray-200 pt-4">
						<h3 class="text-lg font-semibold">{t('admin.productForm.pricingPhasesTitle')}</h3>
						<p class="text-sm text-gray-600 mt-1 mb-3">
							{t('admin.productForm.pricingPhasesHint')}
						</p>

						{#each pricingSchedule as phase, i}
							{@const maxReminderSeconds = Math.min(
								MAX_PHASE_REMINDER_SECONDS,
								subscriptionUnitToSeconds(1, phase.unit)
							)}
							{@const maxReminderValue = Math.floor(
								maxReminderSeconds / subscriptionUnitToSeconds(1, phase.reminderUnit)
							)}
							<div class="border border-gray-300 rounded p-3 mb-2">
								<div class="flex items-center justify-between mb-2">
									<span class="font-semibold"
										>{t('admin.productForm.phaseNumber', { number: i + 1 })}</span
									>
									<div class="flex gap-1">
										<button
											type="button"
											class="btn btn-gray"
											disabled={i === 0}
											on:click={() => movePricingPhase(i, -1)}
											title={t('admin.productForm.movePhaseUp')}>↑</button
										>
										<button
											type="button"
											class="btn btn-gray"
											disabled={i === pricingSchedule.length - 1}
											on:click={() => movePricingPhase(i, 1)}
											title={t('admin.productForm.movePhaseDown')}>↓</button
										>
										<button
											type="button"
											class="btn btn-red"
											on:click={() => removePricingPhase(i)}
											title={t('admin.productForm.deletePhase')}>🗑</button
										>
									</div>
								</div>

								<div class="grid grid-cols-1 md:grid-cols-3 gap-3">
									<label class="form-label">
										{t('admin.productForm.phaseDuration')}
										<div class="flex gap-1">
											<input
												type="number"
												min="1"
												step="1"
												class="form-input w-20"
												max="10"
												name="pricingSchedule[{i}].value"
												bind:value={phase.value}
												required
											/>
											<select
												class="form-input"
												name="pricingSchedule[{i}].unit"
												bind:value={phase.unit}
												required
											>
												{#each SUBSCRIPTION_DURATIONS as d}
													<option value={d}>{d}</option>
												{/each}
											</select>
										</div>
									</label>

									<label class="form-label">
										{t('admin.productForm.phasePriceExcluded')}
										<input
											type="number"
											min="0"
											step="any"
											class="form-input"
											name="pricingSchedule[{i}].priceAmount"
											bind:value={phase.priceAmount}
											required
										/>
										<span class="text-xs text-gray-500 mt-1 block">
											{t('admin.productForm.phasePriceHint')}
										</span>
									</label>

									<label class="form-label">
										{t('admin.productForm.phaseReminderBeforeEnd')}
										<div class="flex gap-1">
											<input
												type="number"
												min="0"
												step="1"
												class="form-input w-20"
												max={maxReminderValue}
												name="pricingSchedule[{i}].reminderValue"
												bind:value={phase.reminderValue}
												required
											/>
											<select
												class="form-input"
												name="pricingSchedule[{i}].reminderUnit"
												bind:value={phase.reminderUnit}
												required
											>
												{#each ['day', 'hour'] as d}
													<option value={d}>{d}</option>
												{/each}
											</select>
										</div>
										<span class="text-xs text-gray-500 mt-1 block"
											>{t('admin.productForm.phaseReminderHint')}</span
										>
									</label>
								</div>
							</div>
						{/each}

						<button
							type="button"
							class="btn btn-black"
							on:click={addPricingPhase}
							disabled={pricingSchedule.length >= 10}
						>
							+ {t('admin.productForm.addPhase')}
						</button>
					</div>
				{/if}
			</div>
		</details>

		<!-- Inventory & Stock - Collapsible -->
		<details class="bg-white border border-gray-200 rounded-lg shadow-sm">
			<summary
				class="p-4 cursor-pointer hover:bg-gray-50 rounded-lg font-medium text-gray-900 flex items-center"
			>
				<svg
					class="w-5 h-5 mr-2 transition-transform"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M19 9l-7 7-7-7"
					/>
				</svg>
				{t('admin.productForm.inventoryAndStock')}
			</summary>
			<div class="p-4 pt-0 space-y-4">
				{#if product.type === 'resource'}
					<div class="flex flex-wrap gap-4">
						<label class="form-label">
							{t('admin.productForm.availableDate')}
							<input
								class="form-input"
								type="date"
								name="availableDate"
								disabled={disableDateChange}
								bind:value={availableDateStr}
							/>
							<span class="text-sm text-gray-500 mt-1"
								>{t('admin.productForm.availableDateHintBefore')}
								<kbd class="kbd body-secondaryCTA">{t('admin.productForm.backspace')}</kbd>
								{t('admin.productForm.availableDateHintAfter')}</span
							>
						</label>
						{#if !isNew}
							<label class="checkbox-label">
								<input class="form-checkbox" type="checkbox" bind:checked={disableDateChange} />
								🔐 {t('admin.productForm.lockDateChanges')}
							</label>
						{/if}
					</div>

					<div class="space-y-3">
						<label
							class="checkbox-label {enablePreorder ? '' : 'cursor-not-allowed text-gray-450'}"
						>
							<input
								class="form-checkbox {enablePreorder ? '' : 'cursor-not-allowed border-gray-450'}"
								type="checkbox"
								bind:checked={product.preorder}
								name="preorder"
								disabled={!enablePreorder}
							/>
							{t('admin.productForm.enablePreordersBeforeAvailableDate')}
						</label>

						<label
							class="checkbox-label {enablePreorder ? '' : 'cursor-not-allowed text-gray-450'}"
						>
							<input
								class="form-checkbox {enablePreorder ? '' : 'cursor-not-allowed border-gray-450'}"
								type="checkbox"
								bind:checked={displayPreorderCustomText}
								name="displayCustomPreorderText"
								disabled={!enablePreorder}
							/>
							{t('admin.productForm.displayCustomTextForPreorder')}
						</label>

						{#if displayPreorderCustomText}
							<label class="form-label">
								{t('admin.productForm.preorderCustomText')}
								<textarea
									name="customPreorderText"
									required
									cols="30"
									rows="2"
									maxlength="1000"
									value={product?.customPreorderText ?? ''}
									class="form-input"
									placeholder={t('admin.productForm.customPreorderMessagePlaceholder')}
								/>
							</label>
						{/if}
					</div>

					<label class="checkbox-label">
						<input class="form-checkbox" type="checkbox" name="hasStock" bind:checked={hasStock} />
						{t('admin.productForm.theProductHasALimitedStock')}
					</label>

					{#if hasStock}
						<div class="bg-orange-50 p-4 rounded-lg">
							<label class="form-label">
								{t('admin.productForm.stockQuantity')}
								<input
									class="form-input"
									type="number"
									name="stock"
									placeholder={t('admin.productForm.stock')}
									step="1"
									min="0"
									value={product.stock?.total ?? 0}
								/>
							</label>

							<label class="form-label">
								{t('admin.product.stockReference.label')}
								<select
									class="form-input"
									name="stockReferenceProductId"
									value={product.stockReference?.productId ?? ''}
								>
									<option value="">{t('admin.product.stockReference.noReference')}</option>
									{#each productsWithStock as p}
										{#if p._id !== product._id}
											<option value={p._id}>{p.name}</option>
										{/if}
									{/each}
								</select>
							</label>

							{#if product.stockReference?.productId}
								<p class="text-sm text-gray-600">
									{t('admin.product.stockReference.warning')}
								</p>
							{/if}

							{#if !isNew}
								<div class="mt-3 text-sm text-gray-600">
									<p><strong>{t('admin.productForm.stockInformation')}</strong></p>
									<ul class="list-disc list-inside space-y-1">
										<li>
											{t('admin.productForm.inPendingOrdersCarts')} <strong>{reserved}</strong>
										</li>
										<li>
											<a
												href="{adminPrefix}/order?productAlias={product.alias?.[0]}"
												class="underline text-blue-600"
											>
												{t('admin.productForm.amountSold')} <strong>{sold}</strong>
											</a>
										</li>
										{#if product.isTicket}
											<li>
												{t('admin.productForm.amountScanned')} <strong>{scanned}</strong>
											</li>
											<li>
												{t('admin.productForm.soldButNotScanned')}
												<strong>{sold - scanned}</strong>
											</li>
										{/if}
									</ul>
								</div>
							{/if}
						</div>
					{/if}
				{/if}

				{#if product.type !== 'subscription'}
					<label class="form-label">
						{t('admin.productForm.maxQuantityPerOrder')}
						<input
							class="form-input"
							type="number"
							name="maxQuantityPerOrder"
							placeholder={t('admin.productForm.maxQuantityPerOrder')}
							step="1"
							min="1"
							value={product.maxQuantityPerOrder || DEFAULT_MAX_QUANTITY_PER_ORDER}
						/>
					</label>
				{/if}
			</div>
			<input type="hidden" name="changedDate" value={changedDate} />
		</details>

		<!-- Booking & Tickets - Collapsible -->
		{#if product.type === 'resource'}
			<details class="bg-white border border-gray-200 rounded-lg shadow-sm">
				<summary
					class="p-4 cursor-pointer hover:bg-gray-50 rounded-lg font-medium text-gray-900 flex items-center"
				>
					<svg
						class="w-5 h-5 mr-2 transition-transform"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M19 9l-7 7-7-7"
						/>
					</svg>
					{t('admin.productForm.bookingAndTickets')}
				</summary>
				<div class="p-4 pt-0 space-y-4">
					<label class="checkbox-label">
						<input
							class="form-checkbox"
							type="checkbox"
							name="isTicket"
							bind:checked={product.isTicket}
						/>
						{t('admin.productForm.theProductIsATicket')}
					</label>

					<label class="checkbox-label">
						<input class="form-checkbox" type="checkbox" bind:checked={hasBooking} />
						{t('admin.productForm.theProductIsABookingSlot')}
					</label>

					{#if hasBooking}
						<div class="bg-indigo-50 p-4 rounded-lg space-y-4">
							<label class="form-label">
								{t('admin.productForm.bookingSlotDuration')}
								<select
									name="bookingSpec.slotMinutes"
									class="form-input"
									bind:value={bookingSpec.slotMinutes}
								>
									{#each bookingSpecSlotOptions as { value, label }}
										<option {value}>
											{label}
										</option>
									{/each}
								</select>
							</label>

							{#if bookingSpec.slotMinutes === 60 * 24}
								<label class="form-label flex-row gap-2 items-center">
									<input
										type="checkbox"
										name="bookingSpec.allowSameDayBooking"
										bind:checked={bookingSpec.allowSameDayBooking}
									/>
									<span>Allow booking on same day</span>
								</label>

								{#if bookingSpec.allowSameDayBooking}
									<label class="form-label">
										Max hour for same-day booking (schedule timezone)
										<input
											type="time"
											name="bookingSpec.sameDayBookingMaxHour"
											class="form-input"
											bind:value={bookingSpec.sameDayBookingMaxHour}
											required
										/>
									</label>
								{/if}
							{/if}

							<label class="form-label">
								{t('admin.productForm.timezone')}
								<select name="bookingSpec.schedule.timezone" class="form-input">
									<option value={Intl.DateTimeFormat().resolvedOptions().timeZone}>
										{Intl.DateTimeFormat().resolvedOptions().timeZone}
									</option>
									{#each Intl.supportedValuesOf('timeZone') as timezone}
										<option value={timezone}>{timezone}</option>
									{/each}
								</select>
							</label>

							<label class="form-label">
								{t('admin.productForm.maxBookableDays')}
								<input
									type="number"
									name="bookingSpec.maxBookableDays"
									class="form-input"
									min="0"
									value={product.bookingSpec?.maxBookableDays ?? 0}
								/>
							</label>

							<div>
								<p class="text-sm font-medium text-gray-700 mb-2">
									{t('admin.productForm.weeklySchedule')}
								</p>
								<div class="grid gap-2" style="grid-template-columns: min-content 1fr 1fr;">
									<div class="text-sm font-medium text-gray-600">{t('admin.productForm.day')}</div>
									<div class="text-sm font-medium text-gray-600">
										{t('admin.productForm.start')}
									</div>
									<div class="text-sm font-medium text-gray-600">{t('admin.productForm.end')}</div>

									{#each dayList as day}
										<label class="form-label flex-row gap-2 items-center" for="{day}-start">
											{t(`admin.productForm.dayName.${day}`)}
										</label>

										<input
											id="{day}-start"
											type="time"
											class="form-input"
											bind:value={days[day].start}
											on:change={() => (days = { ...days })}
										/>
										<input
											id="{day}-end"
											type="time"
											class="form-input"
											bind:value={days[day].end}
											on:change={() => (days = { ...days })}
										/>

										{#if days[day].start && days[day].end}
											<input
												type="hidden"
												name="bookingSpec.schedule[{day}].start"
												value={days[day].start}
											/>
											<input
												type="hidden"
												name="bookingSpec.schedule[{day}].end"
												value={days[day].end}
											/>
										{/if}
									{/each}
								</div>
							</div>

							{#if existingScheduleId}
								<div class="pt-2">
									<a
										href="{adminPrefix}/schedule/{existingScheduleId}"
										target="_blank"
										class="inline-flex items-center text-sm text-blue-600 hover:underline"
									>
										{t('admin.productForm.editAssociatedSchedule')}
										<svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
											/>
										</svg>
									</a>
								</div>
								{#if currentBookings.length > 0}
									<div class="mt-3">
										<p class="text-sm font-medium text-gray-700">
											⌚ {t('admin.productForm.currentBookings')}
										</p>
										<ul class="text-sm mt-1 space-y-1">
											{#each currentBookings as booking (booking.orderId + String(booking.beginsAt))}
												<li>
													{new Date(booking.beginsAt).toLocaleString()} &rarr;
													{new Date(booking.endsAt).toLocaleString()}
													({formatDuration(booking.beginsAt, booking.endsAt)}) &mdash;
													<a href="/order/{booking.orderId}" class="text-blue-600 hover:underline">
														#{booking.orderNumber}
													</a>
												</li>
											{/each}
										</ul>
									</div>
								{/if}
								{#if upcomingBookings.length > 0}
									<div class="mt-3">
										<p class="text-sm font-medium text-gray-700">
											{t('admin.productForm.upcomingBookingsNext5')}
										</p>
										<ul class="text-sm mt-1 space-y-1">
											{#each upcomingBookings as booking (booking.orderId + String(booking.beginsAt))}
												<li>
													{new Date(booking.beginsAt).toLocaleString()} &rarr;
													{new Date(booking.endsAt).toLocaleString()}
													({formatDuration(booking.beginsAt, booking.endsAt)}) &mdash;
													<a href="/order/{booking.orderId}" class="text-blue-600 hover:underline">
														#{booking.orderNumber}
													</a>
												</li>
											{/each}
										</ul>
									</div>
								{/if}
							{/if}
						</div>
					{/if}
				</div>
			</details>
		{/if}

		<!-- Delivery & Shipping - Collapsible -->
		{#if product.type !== 'donation'}
			<details class="bg-white border border-gray-200 rounded-lg shadow-sm">
				<summary
					class="p-4 cursor-pointer hover:bg-gray-50 rounded-lg font-medium text-gray-900 flex items-center"
				>
					<svg
						class="w-5 h-5 mr-2 transition-transform"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M19 9l-7 7-7-7"
						/>
					</svg>
					{t('admin.productForm.deliveryAndShipping')}
				</summary>
				<div class="p-4 pt-0 space-y-4">
					<label class="checkbox-label">
						<input
							class="form-checkbox"
							type="checkbox"
							name="shipping"
							bind:checked={product.shipping}
						/>
						{t('admin.productForm.productHasPhysicalComponent')}
					</label>

					{#if product.shipping && (globalDeliveryFees.mode === 'perItem' || globalDeliveryFees.applyFlatFeeToEachItem)}
						<div class="bg-green-50 p-4 rounded-lg space-y-4">
							{#if globalDeliveryFees.mode === 'perItem'}
								<DeliveryFeesSelector
									bind:deliveryFees={product.deliveryFees}
									defaultCurrency={product.price.currency}
								/>

								<label class="checkbox-label">
									<input
										type="checkbox"
										name="requireSpecificDeliveryFee"
										bind:checked={product.requireSpecificDeliveryFee}
									/>
									{t('admin.productForm.preventOrderIfNoSpecificDeliveryFee')}
									<span class="text-sm text-gray-600">
										{t('admin.productForm.doNotUse')}
										<a
											href="{adminPrefix}/config/delivery"
											class="text-blue-600 hover:underline"
											target="_blank">{t('admin.productForm.globallyDefinedFees')}</a
										>
										{t('admin.productForm.asFallback')}
									</span>
								</label>
							{/if}

							{#if globalDeliveryFees.mode === 'perItem' || globalDeliveryFees.applyFlatFeeToEachItem}
								<label class="checkbox-label">
									<input
										type="checkbox"
										name="applyDeliveryFeesOnlyOnce"
										bind:checked={product.applyDeliveryFeesOnlyOnce}
									/>
									{t('admin.productForm.applyDeliveryFeeOnlyOnce')}
								</label>
							{/if}
						</div>
					{/if}
				</div>
			</details>
		{/if}

		<!-- Display Settings - Collapsible -->
		<details class="bg-white border border-gray-200 rounded-lg shadow-sm">
			<summary
				class="p-4 cursor-pointer hover:bg-gray-50 rounded-lg font-medium text-gray-900 flex items-center"
			>
				<svg
					class="w-5 h-5 mr-2 transition-transform"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M19 9l-7 7-7-7"
					/>
				</svg>
				{t('admin.productForm.displaySettings')}
			</summary>
			<div class="p-4 pt-0 space-y-4">
				<label class="checkbox-label">
					<input
						class="form-checkbox"
						type="checkbox"
						bind:checked={product.hasSellDisclaimer}
						name="hasSellDisclaimer"
					/>
					{t('admin.productForm.sellWithDisclaimer')}
				</label>

				{#if product.hasSellDisclaimer}
					<div class="bg-yellow-50 p-4 rounded-lg space-y-3">
						<label class="form-label">
							{t('admin.productForm.disclaimerTitle')}
							<input
								name="sellDisclaimerTitle"
								type="text"
								maxlength="60"
								value={sellDisclaimerTitle}
								class="form-input"
								placeholder={t('admin.productForm.disclaimerTitle')}
								required
							/>
						</label>
						<label class="form-label">
							{t('admin.productForm.disclaimerDescription')}
							<textarea
								name="sellDisclaimerReason"
								cols="30"
								rows="2"
								maxlength={MAX_SHORT_DESCRIPTION_LIMIT}
								value={sellDisclaimerReason}
								class="form-input"
								placeholder={t('admin.productForm.explainWhyDisclaimerNeeded')}
								required
							/>
						</label>
					</div>
				{/if}

				<div class="space-y-3">
					<label class="checkbox-label">
						<input
							type="checkbox"
							name="hideFromSEO"
							checked={product.hideFromSEO}
							class="form-checkbox"
						/>
						{t('admin.productForm.hideProductFromSearchEngines')}
					</label>

					<label class="checkbox-label">
						<input
							type="checkbox"
							name="hideDiscountExpiration"
							checked={product.hideDiscountExpiration}
							class="form-checkbox"
						/>
						{t('admin.productForm.hideDiscountExpirationDate')}
					</label>
				</div>

				<div>
					<h4 class="text-lg font-medium text-gray-900 mb-3">
						{t('admin.productForm.actionSettings')}
					</h4>
					<div class="overflow-x-auto">
						<table class="w-full border border-gray-300 divide-y divide-gray-300 text-sm">
							<thead class="bg-gray-100">
								<tr>
									<th class="py-3 px-4 text-left font-medium text-gray-700">
										{t('admin.productForm.action')}
									</th>
									<th class="py-3 px-4 text-center font-medium text-gray-700">
										{t('admin.productForm.eShop')}
									</th>
									<th class="py-3 px-4 text-center font-medium text-gray-700">
										{t('admin.productForm.retailPos')}
									</th>
									<th class="py-3 px-4 text-center font-medium text-gray-700">Google Shopping</th>
									<th class="py-3 px-4 text-center font-medium text-gray-700">Nostr-bot</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-gray-200">
								<tr>
									<td class="py-3 px-4 font-medium text-gray-700">
										{t('admin.productForm.productIsVisible')}
									</td>
									<td class="py-3 px-4 text-center">
										<input
											type="checkbox"
											bind:checked={product.actionSettings.eShop.visible}
											name="eshopVisible"
											class="form-checkbox"
										/>
									</td>
									<td class="py-3 px-4 text-center">
										<input
											type="checkbox"
											bind:checked={product.actionSettings.retail.visible}
											name="retailVisible"
											class="form-checkbox"
										/>
									</td>
									<td class="py-3 px-4 text-center">
										<input
											type="checkbox"
											bind:checked={product.actionSettings.googleShopping.visible}
											name="googleShoppingVisible"
											class="form-checkbox"
										/>
									</td>
									<td class="py-3 px-4 text-center">
										<input
											type="checkbox"
											bind:checked={product.actionSettings.nostr.visible}
											name="nostrVisible"
											class="form-checkbox"
										/>
									</td>
								</tr>
								<tr>
									<td class="py-3 px-4 font-medium text-gray-700">
										{t('admin.productForm.canBeAddedToBasket')}
									</td>
									<td class="py-3 px-4 text-center">
										<input
											type="checkbox"
											bind:checked={product.actionSettings.eShop.canBeAddedToBasket}
											name="eshopBasket"
											class="form-checkbox"
										/>
									</td>
									<td class="py-3 px-4 text-center">
										<input
											type="checkbox"
											bind:checked={product.actionSettings.retail.canBeAddedToBasket}
											name="retailBasket"
											class="form-checkbox"
										/>
									</td>
									<td class="py-3 px-4 text-center text-gray-400">—</td>
									<td class="py-3 px-4 text-center">
										<input
											type="checkbox"
											bind:checked={product.actionSettings.nostr.canBeAddedToBasket}
											name="nostrBasket"
											class="form-checkbox"
										/>
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</details>

		<!-- Advanced Features - Collapsible -->
		<details class="bg-white border border-gray-200 rounded-lg shadow-sm">
			<summary
				class="p-4 cursor-pointer hover:bg-gray-50 rounded-lg font-medium text-gray-900 flex items-center"
			>
				<svg
					class="w-5 h-5 mr-2 transition-transform"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M19 9l-7 7-7-7"
					/>
				</svg>
				{t('admin.productForm.advancedFeatures')}
			</summary>
			<div class="p-4 pt-0 space-y-6">
				<div>
					<h4 class="text-lg font-medium text-gray-900 mb-3">
						{t('admin.productForm.customCtaButtons')}
					</h4>
					<div class="space-y-3">
						{#each [...(product.cta || []), ...Array(productCtaLines).fill( { href: '', label: '', fallback: false } )].slice(0, productCtaLines) as link, i}
							<div class="flex gap-4 items-end p-3 bg-blue-50 rounded-lg">
								<label class="form-label flex-1">
									{t('admin.productForm.buttonText')}
									<input
										type="text"
										name="cta[{i}].label"
										class="form-input"
										maxlength="60"
										value={link.label}
										placeholder={t('admin.productForm.buttonText')}
									/>
								</label>
								<label class="form-label flex-1">
									{t('admin.productForm.url')}
									<input
										type="text"
										name="cta[{i}].href"
										class="form-input"
										value={link.href}
										placeholder="https://example.com"
									/>
								</label>
								<label class="checkbox-label">
									<input
										type="checkbox"
										class="form-checkbox"
										name="cta[{i}].fallback"
										checked={link.fallback}
									/>
									{t('admin.productForm.showOnlyWhenPurchaseIsNotAvailable')}
								</label>
								<button
									type="button"
									class="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md"
									on:click={() => {
										(product.cta = product.cta?.filter(
											(ctaLink) => link.href !== ctaLink.href && link.label !== ctaLink.label
										)),
											(productCtaLines -= 1);
									}}
								>
									🗑️
								</button>
							</div>
						{/each}
						<button class="btn body-mainCTA" on:click={() => (productCtaLines += 1)} type="button">
							{t('admin.productForm.addCtaButton')}
						</button>
					</div>
				</div>

				<div>
					<h4 class="text-lg font-medium text-gray-900 mb-3">
						{t('admin.productForm.externalResources')}
					</h4>
					<p class="text-sm text-gray-600 mb-3">
						{t('admin.productForm.externalResourcesDescription')}
					</p>
					<div class="space-y-3">
						{#each [...(product.externalResources || []), ...Array(externalResourcesLines).fill( { href: '', label: '' } )].slice(0, externalResourcesLines) as link, i}
							<div class="flex gap-4 items-end p-3 bg-green-50 rounded-lg">
								<label class="form-label flex-1">
									{t('admin.productForm.resourceName')}
									<input
										type="text"
										name="externalResources[{i}].label"
										class="form-input"
										maxlength="60"
										value={link.label}
										placeholder={t('admin.productForm.resourceName')}
									/>
								</label>
								<label class="form-label flex-1">
									{t('admin.productForm.url')}
									<input
										type="text"
										name="externalResources[{i}].href"
										class="form-input"
										value={link.href}
										placeholder="https://example.com/resource"
									/>
								</label>
								<button
									type="button"
									class="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md"
									on:click={() => {
										(product.externalResources = product.externalResources?.filter(
											(externalResourceLink) =>
												link.href !== externalResourceLink.href &&
												link.label !== externalResourceLink.label
										)),
											(externalResourcesLines -= 1);
									}}
								>
									🗑️
								</button>
							</div>
						{/each}
						<button
							class="btn body-mainCTA"
							on:click={() => (externalResourcesLines += 1)}
							type="button"
						>
							{t('admin.productForm.addExternalResource')}
						</button>
					</div>
				</div>

				{#if !isNew}
					<div>
						<h4 class="text-lg font-medium text-gray-900 mb-3">
							{t('admin.productForm.cmsContent')}
						</h4>
						<p class="text-sm text-gray-600 mb-4">
							{t('admin.productForm.cmsContentDescription')}
						</p>

						<div class="space-y-6">
							<div class="bg-gray-50 p-4 rounded-lg">
								<label class="form-label">
									{t('admin.productForm.contentBeforeProductDetails')}
									<label class="checkbox-label mt-2">
										<input
											class="form-checkbox"
											type="checkbox"
											name="hideContentBefore"
											checked={product.mobile?.hideContentBefore}
										/>
										{t('admin.productForm.hideOnMobileDevices')}
									</label>
								</label>

								<div class="mt-3">
									<Editor
										scriptSrc="/tinymce/tinymce.js"
										bind:value={product.contentBefore}
										conf={{ plugins: TINYMCE_PLUGINS, toolbar: TINYMCE_TOOLBAR }}
									/>
								</div>

								<p class="text-sm text-gray-600 mt-2">
									{t('admin.productForm.tipAdd')}
									<code class="bg-gray-200 px-1 rounded"
										>[CurrencyCalculator=currency-calculator]</code
									>
									{t('admin.productForm.toIncludeCurrencyCalculatorWidget')}
								</p>

								<label class="checkbox-label mt-3">
									<input
										type="checkbox"
										name="displayRawHTML"
										bind:checked={displayRawHTMLBefore}
										class="form-checkbox"
									/>
									{t('admin.productForm.editAsRawHtml')}
								</label>

								<textarea
									style="display:{displayRawHTMLBefore ? 'block' : 'none'};"
									name="contentBefore"
									cols="30"
									rows="8"
									maxlength={MAX_CONTENT_LIMIT}
									placeholder={t('admin.productForm.htmlContent')}
									class="form-input block w-full mt-2"
									bind:value={product.contentBefore}
								/>
							</div>

							<div class="bg-gray-50 p-4 rounded-lg">
								<label class="form-label">
									{t('admin.productForm.contentAfterProductDetails')}
									<label class="checkbox-label mt-2">
										<input
											class="form-checkbox"
											type="checkbox"
											name="hideContentAfter"
											checked={product.mobile?.hideContentAfter}
										/>
										{t('admin.productForm.hideOnMobileDevices')}
									</label>
								</label>

								<div class="mt-3">
									<Editor
										scriptSrc="/tinymce/tinymce.js"
										bind:value={product.contentAfter}
										conf={{ plugins: TINYMCE_PLUGINS, toolbar: TINYMCE_TOOLBAR }}
									/>
								</div>

								<p class="text-sm text-gray-600 mt-2">
									{t('admin.productForm.tipAdd')}
									<code class="bg-gray-200 px-1 rounded"
										>[CurrencyCalculator=currency-calculator]</code
									>
									{t('admin.productForm.toIncludeCurrencyCalculatorWidget')}
								</p>

								<label class="checkbox-label mt-3">
									<input
										type="checkbox"
										name="displayRawHTML"
										bind:checked={displayRawHTMLAfter}
										class="form-checkbox"
									/>
									{t('admin.productForm.editAsRawHtml')}
								</label>

								<textarea
									style="display:{displayRawHTMLAfter ? 'block' : 'none'};"
									name="contentAfter"
									cols="30"
									rows="8"
									maxlength={MAX_CONTENT_LIMIT}
									placeholder={t('admin.productForm.htmlContent')}
									class="form-input block w-full mt-2"
									bind:value={product.contentAfter}
								/>
							</div>
						</div>
					</div>
				{/if}
			</div>
		</details>

		<!-- Hidden fields and form actions -->
		{#if isNew}
			<input type="hidden" name="duplicateFromId" value={duplicateFromId || ''} />
		{/if}

		{#if errorMessage}
			<div class="bg-red-50 border border-red-200 rounded-lg p-4">
				<p class="text-red-800 font-medium">{t('admin.productForm.error')}</p>
				<p class="text-red-700">{errorMessage}</p>
			</div>
		{/if}

		<!-- Form Actions -->
		<div class="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
			<div class="flex flex-wrap justify-between gap-3">
				<button type="submit" class="btn btn-blue px-8 py-3 font-medium" disabled={submitting}>
					{#if submitting}
						<svg
							class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
						>
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							></circle>
							<path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path>
						</svg>
						{isNew ? t('admin.productForm.creating') : t('admin.productForm.updating')}
					{:else}
						{isNew ? t('admin.productForm.createProduct') : t('admin.productForm.updateProduct')}
					{/if}
				</button>

				{#if !isNew}
					<div class="flex gap-3">
						<a href="/product/{product._id}" class="btn body-mainCTA px-6 py-3" target="_blank">
							{t('admin.productForm.viewProduct')}
						</a>
						<a
							href="{adminPrefix}/product/new?duplicate_from={product._id}"
							class="btn body-mainCTA px-6 py-3"
						>
							{t('admin.productForm.duplicate')}
						</a>
						<button
							type="submit"
							class="btn btn-red px-6 py-3 font-medium"
							formaction="?/delete"
							on:click={confirmDelete}
							disabled={submitting}
						>
							{t('admin.productForm.deleteProduct')}
						</button>
					</div>
				{/if}
			</div>
		</div>
	</fieldset>
</form>

<style>
	/* Improve collapsible section animations */
	details > summary {
		transition: background-color 0.2s ease;
	}

	details[open] > summary svg {
		transform: rotate(180deg);
	}

	details > summary svg {
		transition: transform 0.2s ease;
	}

	/* Improve form styling */
	.form-input:focus {
		outline: 2px solid rgb(59 130 246 / 0.5);
		border-color: rgb(59 130 246);
	}

	.form-checkbox:focus {
		outline: 2px solid rgb(59 130 246 / 0.5);
	}
</style>
