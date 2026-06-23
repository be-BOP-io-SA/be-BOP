<script lang="ts">
	import { useI18n } from '$lib/i18n';
	import type { CheckoutFieldDisplay } from '$lib/types/CheckoutFieldConfig';

	export let field: CheckoutFieldDisplay;

	const { t, countryName, sortedCountryCodes } = useI18n();

	let isCompany = false;

	$: addressPrefix = `checkoutFieldAddress.${field.slug}`;
	let inputMode: 'numeric' | 'text';
	$: inputMode = field.free?.format === 'number' ? 'numeric' : 'text';
</script>

{#if field.type === 'options'}
	<label class="form-label">
		<span
			>{field.isPersonalData ? '🛡️ ' : ''}{field.label}{#if field.required}<span
					class="text-red-500">*</span
				>{/if}</span
		>
		<select name="checkoutField.{field.slug}" class="form-input" required={field.required}>
			<option value="">--</option>
			{#each field.options ?? [] as option}
				<option value={option}>{option}</option>
			{/each}
		</select>
	</label>
{:else if field.type === 'free'}
	<label class="form-label">
		<span
			>{field.isPersonalData ? '🛡️ ' : ''}{field.label}{#if field.required}<span
					class="text-red-500">*</span
				>{/if}</span
		>
		<input
			type="text"
			name="checkoutField.{field.slug}"
			class="form-input"
			required={field.required}
			maxlength={field.free?.maxLength}
			inputmode={inputMode}
		/>
	</label>
{:else if field.type === 'address'}
	<fieldset class="grid grid-cols-6 gap-2">
		<legend class="form-label">
			<span
				>{field.isPersonalData ? '🛡️ ' : ''}{field.label}{#if field.required}<span
						class="text-red-500">*</span
					>{/if}</span
			>
		</legend>

		<label class="form-label col-span-3">
			{t('address.firstName')}
			<input
				type="text"
				class="form-input"
				name="{addressPrefix}.firstName"
				required={field.required}
			/>
		</label>
		<label class="form-label col-span-3">
			{t('address.lastName')}
			<input
				type="text"
				class="form-input"
				name="{addressPrefix}.lastName"
				required={field.required}
			/>
		</label>
		<label class="form-label col-span-6">
			{t('address.address')}
			<input
				type="text"
				class="form-input"
				name="{addressPrefix}.address"
				required={field.required}
			/>
		</label>
		<label class="form-label col-span-3">
			{t('address.country')}
			<select name="{addressPrefix}.country" class="form-input" required={field.required}>
				{#each sortedCountryCodes() as code}
					<option value={code}>{countryName(code)}</option>
				{/each}
			</select>
		</label>
		<label class="form-label col-span-3">
			{t('address.state')}
			<input type="text" class="form-input" name="{addressPrefix}.state" />
		</label>
		<label class="form-label col-span-3">
			{t('address.city')}
			<input type="text" class="form-input" name="{addressPrefix}.city" required={field.required} />
		</label>
		<label class="form-label col-span-3">
			{t('address.zipCode')}
			<input type="text" class="form-input" name="{addressPrefix}.zip" required={field.required} />
		</label>
		<label class="form-label col-span-6">
			{t('address.phone')}
			<input type="tel" class="form-input" name="{addressPrefix}.phone" />
		</label>

		<label class="col-span-6 checkbox-label">
			<input
				type="checkbox"
				name="{addressPrefix}.isCompany"
				value="true"
				bind:checked={isCompany}
			/>
			{t('address.companyName')}
		</label>

		{#if isCompany}
			<label class="form-label col-span-3">
				{t('address.companyName')}
				<input type="text" class="form-input" name="{addressPrefix}.companyName" required />
			</label>
			<label class="form-label col-span-3">
				{t('address.vatNumber')}
				<input type="text" class="form-input" name="{addressPrefix}.vatNumber" />
			</label>
		{/if}
	</fieldset>
{/if}
