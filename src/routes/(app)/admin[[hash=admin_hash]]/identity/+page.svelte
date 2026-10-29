<script lang="ts">
	import { useI18n } from '$lib/i18n.js';

	export let data;

	let id = data.sellerIdentity;
	let mainShopInfo = data.shopInformation;
	let issuerInfo = id?.invoice?.issuerInfo;
	let iban = id?.bank?.iban ?? '';
	let bic = id?.bank?.bic ?? '';
	let bankAccountHolder = id?.bank?.accountHolder ?? '';
	let bankAccountHolderAddress = id?.bank?.accountHolderAddress ?? '';

	const { t, sortedCountryCodes, countryName } = useI18n();
</script>

<h1 class="text-3xl">{t('admin.identity.sellerIdentity')}</h1>

<form class="contents" method="post">
	<h2 class="text-2xl">{t('admin.identity.legalInformation')}</h2>

	<label class="form-label">
		{t('admin.identity.businessName')}
		<input
			type="text"
			name="businessName"
			class="form-input max-w-[25rem]"
			required
			value={id?.businessName ?? ''}
		/>
	</label>

	<label class="form-label">
		{t('admin.identity.vatNumber')}
		<input
			type="text"
			name="vatNumber"
			class="form-input max-w-[25rem]"
			value={id?.vatNumber ?? ''}
		/>
	</label>

	<h2 class="text-2xl">{t('admin.identity.companyAddress')}</h2>

	<label class="form-label">
		{t('admin.identity.street')}
		<input
			type="text"
			name="address.street"
			class="form-input max-w-[25rem]"
			required
			value={id?.address.street ?? ''}
		/>
	</label>

	<label class="form-label">
		{t('admin.identity.country')}
		<select name="address.country" class="form-input max-w-[25rem]">
			{#each sortedCountryCodes() as countryCode}
				<option value={countryCode} selected={countryCode === id?.address?.country}>
					{countryName(countryCode)}
				</option>
			{/each}
		</select>
	</label>

	<div class="flex flex-wrap gap-2">
		<label class="form-label">
			{t('admin.identity.state')}
			<input
				type="text"
				name="address.state"
				class="form-input max-w-[25rem]"
				value={id?.address.state ?? ''}
			/>
		</label>

		<label class="form-label">
			{t('admin.identity.city')}
			<input
				type="text"
				name="address.city"
				class="form-input max-w-[25rem]"
				required
				value={id?.address.city ?? ''}
			/>
		</label>

		<label class="form-label">
			{t('admin.identity.zipCode')}
			<input
				type="text"
				name="address.zip"
				class="form-input max-w-[25rem]"
				required
				value={id?.address.zip ?? ''}
			/>
		</label>
	</div>

	<h2 class="text-2xl">{t('admin.identity.contactInformation')}</h2>

	<label class="form-label">
		{t('admin.identity.email')}
		<input
			type="email"
			name="contact.email"
			class="form-input max-w-[25rem]"
			required
			value={id?.contact.email ?? ''}
		/>
	</label>

	<label class="form-label">
		{t('admin.identity.phone')}
		<input
			type="tel"
			name="contact.phone"
			class="form-input max-w-[25rem]"
			value={id?.contact.phone ?? ''}
		/>
	</label>

	<h2 class="text-2xl">{t('admin.identity.bankAccount')}</h2>

	<label class="form-label">
		{t('admin.identity.accountHolderName')}
		<input
			type="text"
			name="bank.accountHolder"
			class="form-input max-w-[25rem]"
			maxlength="100"
			value={bankAccountHolder}
		/>
	</label>

	<label class="form-label">
		{t('admin.identity.accountHolderAddress')}
		<input
			type="text"
			name="bank.accountHolderAddress"
			class="form-input max-w-[25rem]"
			maxlength="500"
			value={bankAccountHolderAddress}
		/>
	</label>

	<label class="form-label">
		{t('admin.identity.iban')}
		<input
			type="text"
			name="bank.iban"
			class="form-input max-w-[25rem]"
			bind:value={iban}
			required={!!bic}
		/>
	</label>

	<label class="form-label">
		{t('admin.identity.bic')}
		<input
			type="text"
			name="bank.bic"
			class="form-input max-w-[25rem]"
			bind:value={bic}
			required={!!iban}
		/>
	</label>

	<h2 class="text-2xl">{t('admin.identity.invoiceInformation')}</h2>
	<button
		type="button"
		class="btn btn-blue self-start"
		on:click={() => (issuerInfo = mainShopInfo?.invoice?.issuerInfo)}
		>{t('admin.identity.fillWithMainShopInformations')}</button
	>

	<label class="form-label">
		{t('admin.identity.veryTopRightIssuerInformation')}
		<textarea
			name="invoice.issuerInfo"
			class="form-input max-w-[25rem]"
			rows="5"
			value={issuerInfo ?? ''}
		/>
		<p class="text-sm">
			{t('admin.identity.issuerInfoHelp')}
		</p>
	</label>
	<div>
		<button type="submit" class="btn btn-black self-start">{t('admin.action.update')}</button>
	</div>
</form>
