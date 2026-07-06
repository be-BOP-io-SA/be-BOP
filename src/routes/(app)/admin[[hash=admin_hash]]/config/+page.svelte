<script lang="ts">
	import { enhance } from '$app/forms';
	import IconRefresh from '$lib/components/icons/IconRefresh.svelte';
	import IconUpArrow from '~icons/ant-design/arrow-up-outlined';
	import IconDownArrow from '~icons/ant-design/arrow-down-outlined';

	import { sortCurrencies, currenciesToSelectOptions } from '$lib/types/Currency';
	import { ORDER_PAYMENT_STATUSES } from '$lib/types/Order';
	import { DELAY_MULTIPLIERS } from '$lib/utils/delayMultipliers';
	import { typedInclude } from '$lib/utils/typedIncludes';
	import { formatDistance } from 'date-fns';
	import { exchangeRate } from '$lib/stores/exchangeRate';
	import { useI18n } from '$lib/i18n.js';
	import CurrencyLabel from '$lib/components/CurrencyLabel.svelte';
	import IconInfo from '$lib/components/icons/IconInfo.svelte';
	import { SUBSCRIPTION_DURATIONS } from '$lib/types/SubscriptionDuration';
	import MultiSelect from 'svelte-multiselect';
	import Select from 'svelte-select';
	import ProcessorSelector from '$lib/components/ProcessorSelector.svelte';
	export let data;
	export let form;

	let vatExempted = data.vatExempted;
	let vatSingleCountry = data.vatSingleCountry;
	let priceReferenceCurrency = data.currencies.priceReference;
	let hasCartLimitProductLine = !!data.cartMaxSeparateItems;
	let hasPhysicalCartMinAmount = !!data.physicalCartMinAmount;

	let dataCleanupOnExpire = data.dataCleanup.onOrderExpireOrCancel;
	let dataCleanupManual = data.dataCleanup.allowUserManualCleanup;
	let dataCleanupScheduled = data.dataCleanup.scheduled.enabled;
	const storedSeconds = data.dataCleanup.scheduled.delaySeconds;
	const defaultUnit =
		Object.entries(DELAY_MULTIPLIERS)
			.reverse()
			.find(([, mult]) => storedSeconds > 0 && storedSeconds % mult === 0)?.[0] ?? 'days';
	let cleanupDelayUnit = storedSeconds > 0 ? defaultUnit : 'years';
	let cleanupDelayValue =
		storedSeconds > 0 ? storedSeconds / (DELAY_MULTIPLIERS[defaultUnit] ?? 86400) : 2;
	let cleanupStatuses = data.dataCleanup.scheduled.orderStatuses;

	// Currency options for Select components (sorted: BTC/SAT → fiat A-Z)
	// Exclude SAT for main/secondary/accounting
	const sortedCurrencies = sortCurrencies();
	const currenciesWithoutSat = currenciesToSelectOptions(
		sortedCurrencies.filter((c) => c !== 'SAT')
	);
	const allCurrenciesOptions = currenciesToSelectOptions(sortedCurrencies);

	// Selected values for Select components
	let selectedMainCurrency =
		currenciesWithoutSat.find((c) => c.value === data.currencies.main) || null;
	let selectedSecondaryCurrency = data.currencies.secondary
		? currenciesWithoutSat.find((c) => c.value === data.currencies.secondary)
		: null;
	let selectedPriceReferenceCurrency =
		allCurrenciesOptions.find((c) => c.value === data.currencies.priceReference) || null;
	let selectedAccountingCurrency = data.accountingCurrency
		? currenciesWithoutSat.find((c) => c.value === data.accountingCurrency)
		: null;

	$: priceReferenceCurrency =
		selectedPriceReferenceCurrency?.value || data.currencies.priceReference;
	async function onOverwrite(event: Event) {
		if (!confirm(t('admin.config.overwriteCurrencyConfirm'))) {
			event.preventDefault();
		}
	}

	// Snapshot initial auto-clean control values so confirmUpdate only triggers when the
	// admin actually modified an auto-clean field (issue #2604).
	const initialAutoclean = {
		onOrderExpireOrCancel: dataCleanupOnExpire,
		allowUserManualCleanup: dataCleanupManual,
		scheduledEnabled: dataCleanupScheduled,
		delayValue: cleanupDelayValue,
		delayUnit: cleanupDelayUnit,
		orderStatuses: [...cleanupStatuses].sort().join(',')
	};

	function autocleanChanged(currentStatuses: string[]) {
		if (dataCleanupOnExpire !== initialAutoclean.onOrderExpireOrCancel) {
			return true;
		}
		if (dataCleanupManual !== initialAutoclean.allowUserManualCleanup) {
			return true;
		}
		if (dataCleanupScheduled !== initialAutoclean.scheduledEnabled) {
			return true;
		}
		if (cleanupDelayValue !== initialAutoclean.delayValue) {
			return true;
		}
		if (cleanupDelayUnit !== initialAutoclean.delayUnit) {
			return true;
		}
		// Status checkboxes only render when scheduled is on; if it's off both initially
		// and now, currentStatuses is always [] (DOM-empty) and would falsely mismatch a
		// stale non-empty initialAutoclean.orderStatuses.
		if (
			(initialAutoclean.scheduledEnabled || dataCleanupScheduled) &&
			currentStatuses.slice().sort().join(',') !== initialAutoclean.orderStatuses
		) {
			return true;
		}
		return false;
	}

	function confirmUpdate(e: Event) {
		const formData = new FormData(e.target as HTMLFormElement);
		const statuses = formData.getAll('dataCleanup.scheduled.orderStatuses').map(String);
		if (!autocleanChanged(statuses)) {
			return;
		}
		const dangerous = dataCleanupScheduled && cleanupDelayValue > 0 && statuses.length > 0;
		let message: string;
		if (dangerous) {
			const multiplier = DELAY_MULTIPLIERS[cleanupDelayUnit] ?? 86400;
			const cutoffDate = new Date(Date.now() - cleanupDelayValue * multiplier * 1000);
			message = t('admin.config.autocleanDangerousConfirm', {
				statuses: statuses.join(', '),
				date: cutoffDate.toLocaleDateString($locale)
			});
		} else {
			message = t('admin.config.autocleanModifiedConfirm');
		}
		if (!confirm(message)) {
			e.preventDefault();
		}
	}

	let allPaymentMethods = data.allPaymentMethods;

	const { countryName, sortedCountryCodes, locale, t } = useI18n();
	let selectedContactMode =
		data.contactModes?.map((contact) => ({
			value: contact,
			label: ['email', 'nostr'].find((cont) => cont === contact) ?? contact
		})) ?? [];

	// Available processors (based on configured ones)
	const availableCardProcessors = [
		{ name: 'sumup' as const, configured: data.sumUpConfigured },
		{ name: 'stripe' as const, configured: data.stripeConfigured }
	]
		.filter((p) => p.configured)
		.map((p) => p.name);

	const availableBitcoinProcessors = [
		{ name: 'bitcoin-nodeless' as const, configured: data.bitcoinNodelessConfigured },
		{ name: 'bitcoind' as const, configured: data.bitcoindConfigured }
	]
		.filter((p) => p.configured)
		.map((p) => p.name);

	const availableLightningProcessors = [
		{ name: 'swiss-bitcoin-pay' as const, configured: data.swissBitcoinPayConfigured },
		{ name: 'btcpay-server' as const, configured: data.btcpayServerConfigured },
		{ name: 'phoenixd' as const, configured: data.phoenixdConfigured },
		{ name: 'lnd' as const, configured: data.lndConfigured }
	]
		.filter((p) => p.configured)
		.map((p) => p.name);

	// Reactive local state for live preview
	let selectedCardProcessor = data.preferredProcessorCard;
	let selectedBitcoinProcessor = data.preferredProcessorBitcoin;
	let selectedLightningProcessor = data.preferredProcessorLightning;
</script>

<h1 class="text-3xl">{t('admin.config.generalSettingsTitle')}</h1>

{#if form?.success}
	<div class="alert alert-success">{form.success}</div>
{/if}

<a href="{data.adminPrefix}/config/delivery" class="underline"
	>{t('admin.config.deliverFeesLink')}</a
>

<form method="post" id="overwrite" action="?/overwriteCurrency" on:submit={onOverwrite} use:enhance>
	<input type="hidden" value={priceReferenceCurrency} name="priceReferenceCurrency" />
</form>

<form method="post" action="?/update" class="flex flex-col gap-6" on:submit={confirmUpdate}>
	<h2 class="text-2xl">{t('admin.config.currencies')}</h2>
	<label class="form-label">
		<CurrencyLabel label={t('admin.config.mainCurrency')} />
		<Select
			items={currenciesWithoutSat}
			searchable={true}
			clearable={false}
			bind:value={selectedMainCurrency}
			class="form-input max-w-[25rem]"
		/>
		<input type="hidden" name="mainCurrency" value={selectedMainCurrency?.value || ''} />
	</label>

	<label class="form-label">
		<CurrencyLabel label={t('admin.config.secondaryCurrency')} />
		<Select
			items={currenciesWithoutSat}
			searchable={true}
			clearable={true}
			placeholder={t('admin.config.selectCurrency')}
			bind:value={selectedSecondaryCurrency}
			class="form-input max-w-[25rem]"
		/>
		<input type="hidden" name="secondaryCurrency" value={selectedSecondaryCurrency?.value || ''} />
	</label>

	<label class="form-label">
		<CurrencyLabel label={t('admin.config.priceReferenceCurrency')} />
		<div class="flex gap-2">
			<Select
				items={allCurrenciesOptions}
				searchable={true}
				clearable={false}
				bind:value={selectedPriceReferenceCurrency}
				class="form-input max-w-[25rem]"
			/>
			<input
				type="hidden"
				name="priceReferenceCurrency"
				value={selectedPriceReferenceCurrency?.value || ''}
			/>
			<button type="submit" class="btn btn-red self-start" form="overwrite">
				<IconRefresh />
			</button>
		</div>
	</label>

	<label class="form-label">
		<CurrencyLabel label={t('admin.config.accountingCurrency')} />
		<Select
			items={currenciesWithoutSat}
			searchable={true}
			clearable={true}
			placeholder={t('admin.config.selectCurrency')}
			bind:value={selectedAccountingCurrency}
			class="form-input max-w-[25rem]"
		/>
		<input
			type="hidden"
			name="accountingCurrency"
			value={selectedAccountingCurrency?.value || ''}
		/>
		<p class="text-sm">
			{t('admin.config.accountingCurrencyHint')}
		</p>
	</label>

	<div class="flex items-center gap-2">
		{t('admin.config.exchangeRate')}
		<div
			class="contents"
			title={Object.entries($exchangeRate)
				.map(([k, v]) => `1 BTC = ${v.toLocaleString($locale)} ${k}`)
				.join('\n')}
		>
			<IconInfo class="cursor-pointer"></IconInfo>
		</div>
	</div>
	<h2 class="text-2xl">{t('admin.config.notifications')}</h2>
	<!-- svelte-ignore a11y-label-has-associated-control -->
	<label class="form-label">
		{t('admin.config.contactModes')}
		<MultiSelect
			--sms-options-bg="var(--body-mainPlan-backgroundColor)"
			options={['email', 'nostr'].map((contact) => ({
				value: contact,
				label: contact
			}))}
			bind:selected={selectedContactMode}
			required
		/>
	</label>
	{#each selectedContactMode as contactMode}
		<input type="hidden" name="contactModes" value={contactMode.value} />
	{/each}
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="contactModesForceOption"
			class="form-checkbox"
			checked={data.contactModesForceOption}
		/>
		{t('admin.config.forceOptionDisplay')}
	</label>
	<h2 class="text-2xl">{t('admin.config.cart')}</h2>

	<label class="checkbox-label">
		<input
			type="checkbox"
			name="cartPreviewInteractive"
			class="form-checkbox"
			checked={data.cartPreviewInteractive}
		/>
		{t('admin.config.cartPreviewInteractive')}
	</label>
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="removePopinProductPrice"
			class="form-checkbox"
			checked={data.removePopinProductPrice}
		/>
		{t('admin.config.removePopinProductPrice')}
	</label>
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="allowCartFromUrl"
			class="form-checkbox"
			checked={data.allowCartFromUrl}
		/>
		{t('admin.config.allowCartFromUrl')}
	</label>
	<h2 class="text-2xl">{t('admin.config.checkout')}</h2>

	<a href="{data.adminPrefix}/config/checkout-fields" class="underline">
		{t('admin.config.setCheckoutAdditionalFields')}
	</a>

	<label class="checkbox-label">
		<input
			type="checkbox"
			name="checkoutButtonOnProductPage"
			class="form-checkbox"
			checked={data.checkoutButtonOnProductPage}
		/>
		{t('admin.config.showCheckoutButtonOnProductPage')}
	</label>

	<label class="checkbox-label">
		<input
			type="checkbox"
			name="displayNewsletterCommercialProspection"
			class="form-checkbox"
			checked={data.displayNewsletterCommercialProspection}
		/>
		{t('admin.config.displayNewsletterCommercialProspection')}
	</label>
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="collectIPOnDeliverylessOrders"
			class="form-checkbox"
			checked={data.collectIPOnDeliverylessOrders}
		/>
		{t('admin.config.requestIpCollectionOnDeliverylessOrder')}
	</label>

	<label class="checkbox-label">
		<input
			type="checkbox"
			name="isBillingAddressMandatory"
			class="form-checkbox"
			checked={data.isBillingAddressMandatory}
		/>
		{t('admin.config.mandatoryBillingAddress')}
	</label>

	<label class="checkbox-label">
		<input type="checkbox" name="noProBilling" class="form-checkbox" checked={data.noProBilling} />
		{t('admin.config.onlyAllowNonBusinessCustomers')}
	</label>

	<label class="checkbox-label">
		<input
			type="checkbox"
			name="hasCartLimitProductLine"
			class="form-checkbox"
			bind:checked={hasCartLimitProductLine}
		/>
		{t('admin.config.limitProductLinePerCart')}
	</label>

	{#if hasCartLimitProductLine}
		<label class="form-label">
			{t('admin.config.setMaximumProductLinePerCart')}
			<input
				type="number"
				name="cartMaxSeparateItems"
				class="form-input max-w-[25rem]"
				value={data.cartMaxSeparateItems}
				min="1"
			/>
		</label>
	{/if}
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="defaultOnLocation"
			class="form-checkbox"
			checked={data.defaultOnLocation}
		/>
		{t('admin.config.defaultEnableOnLocationOrder')}
	</label>
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="removeBebopLogoPOS"
			class="form-checkbox"
			checked={data.removeBebopLogoPOS}
		/>
		{t('admin.config.removeBebopLogoFromPos')}
	</label>
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="hasPhysicalCartMinAmount"
			class="form-checkbox"
			bind:checked={hasPhysicalCartMinAmount}
		/>
		{t('admin.config.minCartAmountForPhysical')}
	</label>

	{#if hasPhysicalCartMinAmount}
		<label class="form-label">
			{t('admin.config.setPhysicalCartMinAmount', { currency: data.currencies.main })}
			<input
				type="number"
				name="physicalCartMinAmount"
				class="form-input max-w-[25rem]"
				value={data.physicalCartMinAmount}
				min="1"
			/>
		</label>
	{/if}
	<h2 class="text-2xl">{t('admin.config.order')}</h2>
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="hideCreditCardQrCode"
			class="form-checkbox"
			checked={data.hideCreditCardQrCode}
		/>
		{t('admin.config.hideCreditCardQrCode')}
	</label>
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="overwriteCreditCardSvgColor"
			class="form-checkbox"
			checked={data.overwriteCreditCardSvgColor}
		/>
		{t('admin.config.overwriteCreditCardSvgColor')}
	</label>
	<p>
		{t('admin.config.targetColorChangeIn')}
		<a href="/admin/theme" class="underline">{t('admin.config.theme')}</a>{t(
			'admin.config.themeOrderHint'
		)}
	</p>
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="hideShopBankOnReceipt"
			class="form-checkbox"
			checked={data.hideShopBankOnReceipt}
		/>
		{t('admin.config.hideShopBankOnReceipt')}
	</label>
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="hideShopBankOnTicket"
			class="form-checkbox"
			checked={data.hideShopBankOnTicket}
		/>
		{t('admin.config.hideShopBankOnTicket')}
	</label>
	<h2 class="text-2xl">{t('admin.config.vat')}</h2>

	<label class="checkbox-label">
		<input type="checkbox" name="vatExempted" class="form-checkbox" bind:checked={vatExempted} />
		{t('admin.config.disableVat')}
	</label>
	{#if vatExempted}
		<label class="form-label">
			{t('admin.config.vatExemptionReason')}

			<input
				type="text"
				name="vatExemptionReason"
				class="form-input max-w-[25rem]"
				value={data.vatExemptionReason}
			/>
		</label>
	{:else}
		<label class="checkbox-label">
			<input
				type="checkbox"
				name="vatSingleCountry"
				class="form-checkbox"
				bind:checked={vatSingleCountry}
			/>
			{t('admin.config.useVatRateFromSellerCountry')}
		</label>
		<label class="checkbox-label">
			<input
				type="checkbox"
				name="vatNullOutsideSellerCountry"
				class="form-checkbox"
				bind:checked={data.vatNullOutsideSellerCountry}
			/>
			{t('admin.config.vatZeroOutsideSellerCountry')}
		</label>
		<label class="checkbox-label">
			<input
				type="checkbox"
				name="displayVatIncludedInProduct"
				class="form-checkbox"
				bind:checked={data.displayVatIncludedInProduct}
			/>
			{t('admin.config.displayVatIncludedInProduct')}
		</label>
		<label class="form-label">
			{t('admin.config.sellerCountryForVat')}
			<select name="vatCountry" class="form-input">
				{#each sortedCountryCodes() as countryCode}
					<option value={countryCode} selected={data.vatCountry === countryCode}>
						{countryName(countryCode)}
					</option>
				{/each}
			</select>
		</label>
	{/if}

	<a href="{data.adminPrefix}/config/vat" class="underline"
		>{t('admin.config.manageCustomVatRates')}</a
	>

	<h2 class="text-2xl">{t('admin.config.paymentMethods')}</h2>

	<div class="grid gap-4" style="grid-template-columns: max-content max-content max-content;">
		{#each allPaymentMethods as paymentMethod, i (paymentMethod)}
			<label class="checkbox-label">
				<input
					type="checkbox"
					name="paymentMethods"
					class="form-checkbox"
					value={paymentMethod}
					checked={!data.disabledPaymentMethods.includes(paymentMethod)}
				/>
				{t('checkout.paymentMethod.' + paymentMethod)}
				{paymentMethod === 'point-of-sale' ? t('admin.config.onlyForPosRole') : ''}
			</label>
			<button
				type="button"
				title={t('admin.config.moveDown')}
				class:invisible={i === allPaymentMethods.length - 1}
				on:click={() => {
					allPaymentMethods = [
						...allPaymentMethods.slice(0, i),
						allPaymentMethods[i + 1],
						allPaymentMethods[i],
						...allPaymentMethods.slice(i + 2)
					];
				}}
			>
				<IconDownArrow />
			</button>
			<button
				type="button"
				title={t('admin.config.moveUp')}
				class:invisible={i === 0}
				on:click={() => {
					allPaymentMethods = [
						...allPaymentMethods.slice(0, i - 1),
						allPaymentMethods[i],
						allPaymentMethods[i - 1],
						...allPaymentMethods.slice(i + 1)
					];
				}}
			>
				<IconUpArrow />
			</button>
		{/each}
	</div>

	<h2 class="text-2xl">{t('admin.config.paymentProcessorPreferences')}</h2>
	<p class="text-sm mb-4">
		{t('admin.config.paymentProcessorPreferencesHint')}
	</p>

	<ProcessorSelector
		label={t('admin.config.preferredCardProcessor')}
		name="preferredProcessorCard"
		availableProcessors={availableCardProcessors}
		bind:selectedProcessor={selectedCardProcessor}
		preferredProcessor={data.preferredProcessorCard}
		configLinks={[
			{ href: `${data.adminPrefix}/sumup`, name: 'SumUp' },
			{ href: `${data.adminPrefix}/stripe`, name: 'Stripe' }
		]}
	/>

	<ProcessorSelector
		label={t('admin.config.preferredBitcoinProcessor')}
		name="preferredProcessorBitcoin"
		availableProcessors={availableBitcoinProcessors}
		bind:selectedProcessor={selectedBitcoinProcessor}
		preferredProcessor={data.preferredProcessorBitcoin}
		configLinks={[
			{ href: `${data.adminPrefix}/bitcoin-nodeless`, name: 'Bitcoin Nodeless' },
			{ href: '#', name: t('admin.config.bitcoindViaEnvVars') }
		]}
	/>

	<ProcessorSelector
		label={t('admin.config.preferredLightningProcessor')}
		name="preferredProcessorLightning"
		availableProcessors={availableLightningProcessors}
		bind:selectedProcessor={selectedLightningProcessor}
		preferredProcessor={data.preferredProcessorLightning}
		configLinks={[
			{ href: `${data.adminPrefix}/phoenixd`, name: 'PhoenixD' },
			{ href: `${data.adminPrefix}/swiss-bitcoin-pay`, name: 'Swiss Bitcoin Pay' },
			{ href: `${data.adminPrefix}/btcpay-server`, name: 'BTCPay Server' },
			{ href: '#', name: t('admin.config.lndViaEnvVars') }
		]}
	/>

	<h2 class="text-2xl">{t('admin.config.timing')}</h2>
	<label class="form-label">
		{t('admin.config.defaultSubscriptionDuration')}
		<select
			name="subscriptionDuration"
			value={data.subscriptionDuration}
			class="form-input max-w-[25rem]"
		>
			{#each SUBSCRIPTION_DURATIONS as duration}
				<option value={duration}>{duration}</option>
			{/each}
		</select>
		<p class="text-sm">
			{t('admin.config.subscriptionDurationHint')}
		</p>
	</label>
	<label class="form-label">
		{t('admin.config.subscriptionReminder')}
		<select
			name="subscriptionReminderSeconds"
			value={data.subscriptionReminderSeconds}
			class="form-input max-w-[25rem]"
		>
			{#each [86400 * 7, 86400 * 3, 86400, 3600, 5 * 60] as seconds}
				<option value={seconds}
					>{t('admin.config.beforeEndOfSubscription', {
						duration: formatDistance(0, seconds * 1000)
					})}</option
				>
			{/each}
		</select>
	</label>

	<div class="form-label">
		{t('admin.config.confirmationBlocks')}

		<input
			type="number"
			class="form-input"
			value={data.confirmationBlocksThresholds.defaultBlocks}
			disabled
		/>

		<div class="grid grid-cols-3 gap-2">
			{#each data.confirmationBlocksThresholds.thresholds as threshold}
				<input
					class="form-input"
					disabled
					type="text"
					value="{threshold.minAmount} {data.confirmationBlocksThresholds.currency}"
				/>
				<input
					class="form-input"
					disabled
					type="text"
					value="{threshold.maxAmount} {data.confirmationBlocksThresholds.currency}"
				/>
				<input class="form-input" disabled type="number" value={threshold.confirmationBlocks} />
			{/each}
		</div>

		<a href="{data.adminPrefix}/config/confirmation-threshold" class="underline">
			{t('admin.config.manageConfirmationThresholds')}
		</a>
		<p class="text-sm">{t('admin.config.confirmationThresholdsHint')}</p>
	</div>

	<label class="form-label">
		{t('admin.config.setPaymentTimeoutMinutes')}
		<input
			type="number"
			min="0"
			step="1"
			name="desiredPaymentTimeout"
			class="form-input max-w-[25rem]"
			value={data.desiredPaymentTimeout}
		/>
	</label>
	<label class="form-label">
		{t('admin.config.cartReserveStockMinutes')}
		<input
			type="number"
			min="0"
			step="1"
			name="reserveStockInMinutes"
			class="form-input max-w-[25rem]"
			value={data.reserveStockInMinutes}
		/>
		<p class="text-sm">{t('admin.config.cartReservationExtendedHint')}</p>
	</label>
	<h2 class="text-2xl">{t('admin.config.admin')}</h2>
	<p>
		{t('admin.config.configuredSiteUrl')}
		<a href={data.origin} class="body-hyperlink">{data.origin}</a>
	</p>

	<label class="checkbox-label">
		<input type="checkbox" name="discovery" class="form-checkbox" checked={data.discovery} />
		{t('admin.config.allowProductListAccess')}
	</label>

	<label class="form-label">
		{t('admin.config.adminHash')}

		<input
			type="text"
			name="adminHash"
			class="form-input max-w-[25rem]"
			value={data.adminHash}
			placeholder="xxxxxxxx"
			pattern="[a-zA-Z0-9]+"
		/>
		<p class="text-sm">
			{t('admin.config.adminHashHint')}
			<kbd class="px-2 py-1.5 text-xs font-semibold bg-gray-100 border border-gray-200 rounded-lg">
				/admin-[hash]
			</kbd>
		</p>
	</label>

	<label class="checkbox-label">
		<input
			type="checkbox"
			name="copyOrderEmailsToAdmin"
			class="form-checkbox"
			checked={data.copyOrderEmailsToAdmin && !!data.sellerIdentity?.contact.email}
			disabled={!data.sellerIdentity?.contact.email}
		/>
		{t('admin.config.copyOrderEmailsTo', {
			email: data.sellerIdentity?.contact.email || t('admin.config.noEmailAddress')
		})}
		<a href="{data.adminPrefix}/identity" class="body-hyperlink underline"
			>{t('admin.config.identity')}</a
		>{t('admin.config.identitySectionSuffix')}
	</label>

	<label class="checkbox-label">
		<input
			type="checkbox"
			id="disableLanguageSelector"
			name="disableLanguageSelector"
			class="form-checkbox"
			checked={data.disableLanguageSelector}
		/>
		{t('admin.config.disableLanguageSelector')}
	</label>
	<label class="checkbox-label">
		<input
			type="checkbox"
			id="hideCartInToolbar"
			name="hideCartInToolbar"
			class="form-checkbox"
			checked={data.hideCartInToolbar}
		/>
		{t('admin.config.hideCartInToolbar')}
	</label>
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="isMaintenance"
			class="form-checkbox"
			checked={data.isMaintenance}
		/>
		{t('admin.config.enableMaintenanceMode')}
	</label>

	<label class="form-label">
		{t('admin.config.maintenanceIps')}
		<input
			type="text"
			class="form-input max-w-[25rem]"
			name="maintenanceIps"
			placeholder="x.x.x.x,y.y.y.y"
			value={data.maintenanceIps}
		/>
		<p class="text-sm">
			{t('admin.config.yourIpIs')}
			<code class="font-mono bg-link px-[2px] py-[1px] rounded text-white">{data.ip}</code>
			({countryName(data.countryCode || '-')})
		</p>
	</label>

	<p>
		{t('admin.config.createMaintenancePagePrefix')}
		<a href="/admin/cms/new" class="body-hyperlink underline">{t('admin.config.thisLink')}</a>.
	</p>

	<label class="form-label">
		{t('admin.config.analyticsScriptSnippet')}
		<textarea
			rows="5"
			cols="30"
			class="form-input max-w-[25rem]"
			name="analyticsScriptSnippet"
			placeholder={t('admin.config.analyticsScriptPlaceholder')}
			value={data.analyticsScriptSnippet}
		/>
	</label>
	<h2 class="text-2xl font-semibold mt-8">{t('admin.config.customerDataCleaning')}</h2>
	<p class="text-sm text-gray-500 mb-2">
		{t('admin.config.customerDataCleaningHint')}
	</p>

	<label class="checkbox-label">
		<input
			type="checkbox"
			name="dataCleanup.onOrderExpireOrCancel"
			class="form-checkbox"
			bind:checked={dataCleanupOnExpire}
		/>
		{t('admin.config.autoCleanOnExpireOrCancel')}
	</label>
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="dataCleanup.allowUserManualCleanup"
			class="form-checkbox"
			bind:checked={dataCleanupManual}
		/>
		{t('admin.config.allowManualCleanupRequest')}
	</label>
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="dataCleanup.scheduled.enabled"
			class="form-checkbox"
			bind:checked={dataCleanupScheduled}
		/>
		{t('admin.config.enableScheduledCleanup')}
	</label>
	{#if dataCleanupScheduled}
		<label class="form-label">
			{t('admin.config.cleanupDelay')}
			<div class="flex gap-2 items-center">
				<input
					type="number"
					min="1"
					step="1"
					name="dataCleanup.scheduled.delayValue"
					bind:value={cleanupDelayValue}
					class="form-input w-24"
				/>
				<select
					name="dataCleanup.scheduled.delayUnit"
					bind:value={cleanupDelayUnit}
					class="form-input"
				>
					<option value="hours">{t('admin.config.hours')}</option>
					<option value="days">{t('admin.config.days')}</option>
					<option value="weeks">{t('admin.config.weeks')}</option>
					<option value="months">{t('admin.config.months')}</option>
					<option value="years">{t('admin.config.years')}</option>
				</select>
			</div>
		</label>
		<fieldset class="mt-2">
			<legend class="form-label">{t('admin.config.orderStatusesToClean')}</legend>
			{#each ORDER_PAYMENT_STATUSES as status}
				<label class="inline-flex items-center mr-4">
					<input
						type="checkbox"
						name="dataCleanup.scheduled.orderStatuses"
						value={status}
						checked={typedInclude(cleanupStatuses, status)}
						class="form-checkbox"
					/>
					<span class="ml-1">{status}</span>
				</label>
			{/each}
		</fieldset>
	{/if}

	<div>
		<input type="submit" value={t('admin.action.update')} class="btn body-mainCTA self-start" />
	</div>
</form>

<p>
	{t('admin.config.ip2locationCreditPrefix')}
	<a href="https://lite.ip2location.com" class="text-blue"> https://lite.ip2location.com </a>
	{t('admin.config.ip2locationCreditSuffix')}
</p>
