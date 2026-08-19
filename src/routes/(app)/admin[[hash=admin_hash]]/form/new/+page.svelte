<script lang="ts">
	import { MAX_CONTENT_LIMIT } from '$lib/types/CmsPage';
	import { MAX_NAME_LIMIT } from '$lib/types/Product';
	import { generateId } from '$lib/utils/generateId';
	import { useI18n } from '$lib/i18n';

	export let data;
	let title = '';
	let slug = '';
	let displayFrom = false;
	let mandatoryAgreement = false;

	const { t } = useI18n();
</script>

<h1 class="text-3xl">{t('admin.form.addAContactForm')}</h1>
<p>
	<kbd class="kbd body-secondaryCTA">{'{{websiteLink}}'}</kbd>,
	<kbd class="kbd body-secondaryCTA">{'{{brandName}}'}</kbd>,
	<kbd class="kbd body-secondaryCTA">{'{{pageLink}}'}</kbd>
	{t('admin.form.and')}
	<kbd class="kbd body-secondaryCTA">{'{{pageName}}'}</kbd>
	{t('admin.form.alwaysAvailableInTemplates')}
</p>
<form method="post" class="flex flex-col gap-4">
	<label class="form-label">
		{t('admin.form.title')}
		<input
			class="form-input"
			type="text"
			maxlength={MAX_NAME_LIMIT}
			name="title"
			placeholder={t('admin.form.titlePlaceholder')}
			bind:value={title}
			on:change={() => (slug = generateId(title, true))}
			on:input={() => (slug = generateId(title, true))}
			required
		/>
	</label>

	<label class="form-label">
		{t('admin.form.slug')}
		<input
			class="form-input block"
			type="text"
			name="slug"
			placeholder={t('admin.form.slug')}
			bind:value={slug}
			title={t('admin.form.onlyLowercaseLettersNumbersDashes')}
			required
		/>
	</label>

	<label class="form-label">
		{t('admin.form.target')}
		<input
			class="form-input block"
			type="text"
			name="target"
			placeholder={t('admin.form.targetPlaceholder')}
			value={data.contactModes.includes('email') ? data.sellerIdentity?.contact.email || '' : ''}
			required
			pattern={data.contactModes.includes('email') && data.contactModes.includes('nostr')
				? '^npub.*|^.*@.*'
				: data.contactModes.includes('email')
				? '^.*@.*'
				: data.contactModes.includes('nostr')
				? '^npub.*'
				: '^(?!npub).*'}
		/>
	</label>
	<label class="checkbox-label">
		<input
			class="form-checkbox"
			type="checkbox"
			name="displayFromField"
			bind:checked={displayFrom}
		/>
		{t('admin.form.displayFromColonField')}
	</label>
	{#if displayFrom}
		<label class="checkbox-label">
			<input class="form-checkbox" type="checkbox" name="prefillWithSession" placeholder="From" />
			{t('admin.form.prefillWithSessionInformation')}
		</label>{/if}
	<label class="checkbox-label">
		<input
			class="form-checkbox"
			type="checkbox"
			name="mandatoryAgreement"
			bind:checked={mandatoryAgreement}
		/>
		{t('admin.form.mandatoryAgreementWarning')}
	</label>
	{#if mandatoryAgreement}
		<label class="form-label">
			{t('admin.form.disclaimerLabel')}
			<input
				class="form-input block"
				type="text"
				name="disclaimer.label"
				placeholder={t('admin.form.disclaimerLabel')}
				required
			/>
		</label>
		{t('admin.form.disclaimerContent')}
		<label class="form-label">
			<textarea
				name="disclaimer.content"
				cols="30"
				rows="5"
				maxlength={MAX_CONTENT_LIMIT}
				placeholder={t('admin.form.messagePlaceholder')}
				class="form-input block w-full"
			/>
		</label>
		<label class="form-label">
			{t('admin.form.disclaimerCheckboxLabel')}
			<input
				class="form-input block"
				type="text"
				name="disclaimer.checkboxLabel"
				placeholder={t('admin.form.disclaimerCheckboxLabel')}
				required
			/>
		</label>
	{/if}

	<label class="form-label">
		{t('admin.form.subject')}
		<input
			class="form-input block"
			type="text"
			name="subject"
			placeholder={t('admin.form.subject')}
			required
		/>
	</label>

	{t('admin.form.content')}
	<label class="form-label">
		<textarea
			name="content"
			cols="30"
			rows="10"
			maxlength={MAX_CONTENT_LIMIT}
			placeholder={t('admin.form.messagePlaceholder')}
			class="form-input block w-full"
		/>
	</label>
	<input type="submit" class="btn btn-blue self-start text-white" value={t('admin.form.submit')} />
</form>
