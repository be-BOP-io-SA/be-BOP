<script lang="ts">
	import { enhance } from '$app/forms';
	import IconRefresh from '$lib/components/icons/IconRefresh.svelte';
	import IconUpArrow from '~icons/ant-design/arrow-up-outlined';
	import IconDownArrow from '~icons/ant-design/arrow-down-outlined';

	import { CURRENCIES } from '$lib/types/Currency';
	import { formatDistance } from 'date-fns';
	import { exchangeRate } from '$lib/stores/exchangeRate';
	import { useI18n } from '$lib/i18n.js';
	import IconInfo from '$lib/components/icons/IconInfo.svelte';
	import MultiSelect from 'svelte-multiselect';
	export let data;
	export let form;

	let vatExempted = data.vatExempted;
	let vatSingleCountry = data.vatSingleCountry;
	let priceReferenceCurrency = data.currencies.priceReference;
	let hasCartLimitProductLine = !!data.cartMaxSeparateItems;
	async function onOverwrite(event: Event) {
		if (!confirm('Do you want to overwrite current product currencies with this one?')) {
			event.preventDefault();
		}
	}

	let allPaymentMethods = data.allPaymentMethods;

	const { countryName, sortedCountryCodes, locale, t } = useI18n();
	let selectedContactMode =
		data.contactModes?.map((contact) => ({
			value: contact,
			label: ['email', 'nostr'].find((cont) => cont === contact) ?? contact
		})) ?? [];
</script>

<h1 class="text-3xl">Config</h1>

{#if form?.success}
	<div class="alert alert-success">{form.success}</div>
{/if}

<a href="{data.adminPrefix}/config/delivery" class="underline">Deliver fees</a>

<form method="post" id="overwrite" action="?/overwriteCurrency" on:submit={onOverwrite} use:enhance>
	<input type="hidden" value={priceReferenceCurrency} name="priceReferenceCurrency" />
</form>

<form method="post" action="?/update" class="flex flex-col gap-6">
	<h2 class="text-2xl">Currencies</h2>
	<label class="form-label">
		Main currency
		<select name="mainCurrency" class="form-input max-w-[25rem]">
			{#each CURRENCIES.filter((c) => c !== 'SAT') as currency}
				<option value={currency} selected={data.currencies.main === currency}>{currency}</option>
			{/each}
		</select>
	</label>

	<label class="form-label">
		Secondary currency
		<select name="secondaryCurrency" class="form-input max-w-[25rem]">
			<option value="" selected={!data.currencies.secondary} />
			{#each CURRENCIES.filter((c) => c !== 'SAT') as currency}
				<option value={currency} selected={data.currencies.secondary === currency}>
					{currency}
				</option>
			{/each}
		</select>
	</label>

	<label class="form-label">
		Price reference currency (to avoid exchange rate fluctuations)
		<div class="flex gap-2">
			<select
				name="priceReferenceCurrency"
				bind:value={priceReferenceCurrency}
				class="form-input max-w-[25rem]"
			>
				{#each CURRENCIES as currency}
					<option value={currency}>
						{currency}
					</option>
				{/each}
			</select>
			<button type="submit" class="btn btn-red self-start" form="overwrite">
				<IconRefresh />
			</button>
		</div>
	</label>

	<label class="form-label">
		Accounting currency
		<select name="accountingCurrency" class="form-input max-w-[25rem]">
			<option value="" selected={!data.accountingCurrency} />
			{#each CURRENCIES.filter((c) => c !== 'SAT') as currency}
				<option value={currency} selected={data.accountingCurrency === currency}>
					{currency}
				</option>
			{/each}
		</select>
		<p class="text-sm">
			Payment amounts will also be stored in this currency. Useful for a full-crypto shop but you
			still want to keep track of fiat values at time of payment.
		</p>
	</label>

	<div class="flex items-center gap-2">
		Exchange Rate <div
			class="contents"
			title={Object.entries($exchangeRate)
				.map(([k, v]) => `1 BTC = ${v.toLocaleString($locale)} ${k}`)
				.join('\n')}
		>
			<IconInfo class="cursor-pointer"></IconInfo>
		</div>
	</div>
	<h2 class="text-2xl">Notifications</h2>
	<!-- svelte-ignore a11y-label-has-associated-control -->
	<label class="form-label">
		Contact Modes
		<MultiSelect
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
		Force option display (email even if smtp config is not done, npub even if nsec config is not done)
	</label>
	<h2 class="text-2xl">Cart preview</h2>

	<label class="checkbox-label">
		<input
			type="checkbox"
			name="cartPreviewInteractive"
			class="form-checkbox"
			checked={data.cartPreviewInteractive}
		/>
		Make cart preview interactive
	</label>
	<h2 class="text-2xl">Checkout</h2>

	<label class="checkbox-label">
		<input
			type="checkbox"
			name="checkoutButtonOnProductPage"
			class="form-checkbox"
			checked={data.checkoutButtonOnProductPage}
		/>
		Show "checkout" button on product page
	</label>

	<label class="checkbox-label">
		<input
			type="checkbox"
			name="displayNewsletterCommercialProspection"
			class="form-checkbox"
			checked={data.displayNewsletterCommercialProspection}
		/>
		Display newsletter + commercial prospection option (disabled by default)
	</label>
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="collectIPOnDeliverylessOrders"
			class="form-checkbox"
			checked={data.collectIPOnDeliverylessOrders}
		/>
		Request IP collection on deliveryless order
	</label>

	<label class="checkbox-label">
		<input
			type="checkbox"
			name="isBillingAddressMandatory"
			class="form-checkbox"
			checked={data.isBillingAddressMandatory}
		/>
		Mandatory billing address
	</label>

	<label class="checkbox-label">
		<input type="checkbox" name="noProBilling" class="form-checkbox" checked={data.noProBilling} />
		Only allow non-business customers (no pro-billing option)
	</label>

	<label class="checkbox-label">
		<input
			type="checkbox"
			name="hasCartLimitProductLine"
			class="form-checkbox"
			bind:checked={hasCartLimitProductLine}
		/>
		Limit product line per cart (for law purpose and small business )
	</label>
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="defaultOnLocation"
			class="form-checkbox"
			checked={data.defaultOnLocation}
		/>
		Default enable "this is a fully-paid on-location physical order"
	</label>
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="removeBebopLogoPOS"
			class="form-checkbox"
			checked={data.removeBebopLogoPOS}
		/>
		Remove be-BOP logo from POS QR code
	</label>

	{#if hasCartLimitProductLine}
		<label class="form-label">
			Set maximum product line per cart (minimum 1)
			<input
				type="number"
				name="cartMaxSeparateItems"
				class="form-input max-w-[25rem]"
				value={data.cartMaxSeparateItems}
				min="1"
			/>
		</label>
	{/if}
	<h2 class="text-2xl">Order</h2>
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="hideCreditCardQrCode"
			class="form-checkbox"
			checked={data.hideCreditCardQrCode}
		/>
		Don't display order URL qr code on order paid with credit card
	</label>
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="overwriteCreditCardSvgColor"
			class="form-checkbox"
			checked={data.overwriteCreditCardSvgColor}
		/>
		Overwrite credit card payment processor SVG color with custom color
	</label>
	<p>
		Target color can be changed in <a href="/admin/theme" class="underline">theme</a>("Order" then
		"Credit card svg fill color" in theme)
	</p>
	<h2 class="text-2xl">VAT</h2>

	<label class="checkbox-label">
		<input type="checkbox" name="vatExempted" class="form-checkbox" bind:checked={vatExempted} />
		Disable VAT for my be-BOP
	</label>
	{#if vatExempted}
		<label class="form-label">
			VAT exemption reason (appears on the invoice)

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
			Use VAT rate from seller's country
		</label>
		<label class="checkbox-label">
			<input
				type="checkbox"
				name="vatNullOutsideSellerCountry"
				class="form-checkbox"
				bind:checked={data.vatNullOutsideSellerCountry}
			/>
			Make VAT = 0% for deliveries outside seller's country
		</label>
		<label class="form-label">
			Seller's country for VAT purposes
			<select name="vatCountry" class="form-input">
				{#each sortedCountryCodes() as countryCode}
					<option value={countryCode} selected={data.vatCountry === countryCode}>
						{countryName(countryCode)}
					</option>
				{/each}
			</select>
		</label>
	{/if}

	<a href="{data.adminPrefix}/config/vat" class="underline">Manage custom VAT rates</a>

	<h2 class="text-2xl">Payment methods</h2>

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
				{paymentMethod === 'point-of-sale' ? ' (only for users with POS role)' : ''}
			</label>
			<button
				type="button"
				title="Move down"
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
				title="Move up"
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

	<h2 class="text-2xl">Timing</h2>
	<label class="form-label">
		Subscription duration
		<select
			name="subscriptionDuration"
			class="form-input max-w-[25rem]"
			value={data.subscriptionDuration}
		>
			{#each ['month', 'day', 'hour'] as duration}
				<option value={duration}>{duration}</option>
			{/each}
		</select>
	</label>
	<label class="form-label">
		Subscription reminder
		<select
			name="subscriptionReminderSeconds"
			value={data.subscriptionReminderSeconds}
			class="form-input max-w-[25rem]"
		>
			{#each [86400 * 7, 86400 * 3, 86400, 3600, 5 * 60] as seconds}
				<option value={seconds}
					>{formatDistance(0, seconds * 1000)} before the end of the subscription</option
				>
			{/each}
		</select>
	</label>

	<div class="form-label">
		Confirmation blocks

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
			Manage confirmation thresholds
		</a>
		<p class="text-sm">You can set a different number of confirmations for different amounts.</p>
	</div>

	<label class="form-label">
		Set desired timeout for payment (in minutes)
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
		How much time a cart reserves the stock (in minutes)
		<input
			type="number"
			min="0"
			step="1"
			name="reserveStockInMinutes"
			class="form-input max-w-[25rem]"
			value={data.reserveStockInMinutes}
		/>
		<p class="text-sm">The cart's reservation is extended each time the cart is updated.</p>
	</label>
	<h2 class="text-2xl">Admin</h2>
	<p>Configured site URL: <a href={data.origin} class="body-hyperlink">{data.origin}</a></p>

	<label class="checkbox-label">
		<input type="checkbox" name="discovery" class="form-checkbox" checked={data.discovery} />
		Allow users to access list of all products (through NostR for example)
	</label>

	<label class="form-label">
		Admin hash

		<input
			type="text"
			name="adminHash"
			class="form-input max-w-[25rem]"
			value={data.adminHash}
			placeholder="xxxxxxxx"
			pattern="[a-zA-Z0-9]+"
		/>
		<p class="text-sm">
			This will change the admin url to
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
		Copy order emails to {data.sellerIdentity?.contact.email || '[no email address]'} (set in
		<a href="{data.adminPrefix}/identity" class="body-hyperlink underline">identity</a> section)
	</label>

	<label class="checkbox-label">
		<input
			type="checkbox"
			id="disableLanguageSelector"
			name="disableLanguageSelector"
			class="form-checkbox"
			checked={data.disableLanguageSelector}
		/>
		Disable language selector
	</label>

	<label class="checkbox-label">
		<input
			type="checkbox"
			name="isMaintenance"
			class="form-checkbox"
			checked={data.isMaintenance}
		/>
		Enable maintenance mode
	</label>

	<label class="form-label">
		Maintenance IPs, comma-separated
		<input
			type="text"
			class="form-input max-w-[25rem]"
			name="maintenanceIps"
			placeholder="x.x.x.x,y.y.y.y"
			value={data.maintenanceIps}
		/>
		<p class="text-sm">
			Your IP is <code class="font-mono bg-link px-[2px] py-[1px] rounded text-white"
				>{data.ip}</code
			>
			({countryName(data.countryCode || '-')})
		</p>
	</label>

	<p>
		Create a fullScreen CMS page with "maintenance" slug, to show maintenance page, by following
		<a href="/admin/cms/new" class="body-hyperlink underline">this link</a>.
	</p>

	<label class="form-label">
		Plausible script url
		<input
			type="text"
			class="form-input max-w-[25rem]"
			name="plausibleScriptUrl"
			placeholder="https://plausible.yourdomain.com/js/script.js"
			value={data.plausibleScriptUrl}
		/>
	</label>
	<input type="submit" value="Update" class="btn btn-gray self-start" />
</form>

<p>
	IP2Location LITE data available from <a href="https://lite.ip2location.com" class="text-blue">
		https://lite.ip2location.com
	</a> is used to determine your country from your IP.
</p>
