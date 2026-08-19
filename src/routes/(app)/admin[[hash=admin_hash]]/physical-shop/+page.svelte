<script lang="ts">
	import { useI18n } from '$lib/i18n.js';

	export let data;

	let id = data.shopInformation;

	let iban = id?.bank?.iban ?? '';
	let bic = id?.bank?.bic ?? '';

	const { t, sortedCountryCodes, countryName } = useI18n();
</script>

<h1 class="text-3xl">{t('admin.physicalShop.title')}</h1>

<form class="contents" method="post">
	<h2 class="text-2xl">{t('admin.physicalShop.legalInformation')}</h2>

	<label class="form-label">
		{t('admin.physicalShop.businessName')}
		<input
			type="text"
			name="businessName"
			class="form-input max-w-[25rem]"
			required
			value={id?.businessName ?? ''}
		/>
	</label>

	<label class="form-label">
		{t('admin.physicalShop.vatNumber')}
		<input
			type="text"
			name="vatNumber"
			class="form-input max-w-[25rem]"
			value={id?.vatNumber ?? ''}
		/>
	</label>

	<h2 class="text-2xl">{t('admin.physicalShop.companyAddress')}</h2>

	<label class="form-label">
		{t('admin.physicalShop.street')}
		<input
			type="text"
			name="address.street"
			class="form-input max-w-[25rem]"
			required
			value={id?.address.street ?? ''}
		/>
	</label>

	<label class="form-label">
		{t('admin.physicalShop.country')}
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
			{t('admin.physicalShop.state')}
			<input
				type="text"
				name="address.state"
				class="form-input max-w-[25rem]"
				value={id?.address.state ?? ''}
			/>
		</label>

		<label class="form-label">
			{t('admin.physicalShop.city')}
			<input
				type="text"
				name="address.city"
				class="form-input max-w-[25rem]"
				required
				value={id?.address.city ?? ''}
			/>
		</label>

		<label class="form-label">
			{t('admin.physicalShop.zipCode')}
			<input
				type="text"
				name="address.zip"
				class="form-input max-w-[25rem]"
				required
				value={id?.address.zip ?? ''}
			/>
		</label>
	</div>

	<h2 class="text-2xl">{t('admin.physicalShop.contactInformation')}</h2>

	<label class="form-label">
		{t('admin.physicalShop.email')}
		<input
			type="email"
			name="contact.email"
			class="form-input max-w-[25rem]"
			required
			value={id?.contact.email ?? ''}
		/>
	</label>

	<label class="form-label">
		{t('admin.physicalShop.phone')}
		<input
			type="tel"
			name="contact.phone"
			class="form-input max-w-[25rem]"
			value={id?.contact.phone ?? ''}
		/>
	</label>

	<h2 class="text-2xl">{t('admin.physicalShop.bankAccount')}</h2>

	<label class="form-label">
		{t('admin.physicalShop.iban')}
		<input
			type="text"
			name="bank.iban"
			class="form-input max-w-[25rem]"
			bind:value={iban}
			required={!!bic}
		/>
	</label>

	<label class="form-label">
		{t('admin.physicalShop.bic')}
		<input
			type="text"
			name="bank.bic"
			class="form-input max-w-[25rem]"
			bind:value={bic}
			required={!!iban}
		/>
	</label>

	<h2 class="text-2xl">{t('admin.physicalShop.invoiceInformation')}</h2>

	<label class="form-label">
		{t('admin.physicalShop.issuerInfo')}
		<textarea
			name="invoice.issuerInfo"
			class="form-input max-w-[25rem]"
			rows="5"
			value={id?.invoice?.issuerInfo ?? ''}
		/>
		<p class="text-sm">
			{t('admin.physicalShop.issuerInfoHint')}
		</p>
	</label>

	<div>
		<button type="submit" class="btn btn-black self-start">{t('admin.action.update')}</button>
	</div>
</form>
