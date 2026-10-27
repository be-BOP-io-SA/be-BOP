<script lang="ts">
	import { MAX_CONTENT_LIMIT } from '$lib/types/CmsPage.js';
	import { MAX_NAME_LIMIT } from '$lib/types/Product';
	import { generateId } from '$lib/utils/generateId';
	import { useI18n } from '$lib/i18n';

	export let data;
	let title = data.contactForm.title;
	let slug = data.contactForm._id;
	let displayFrom = data.contactForm.displayFromField;
	let mandatoryAgreement = !!data.contactForm.disclaimer;

	const { t } = useI18n();

	function confirmDelete(event: Event) {
		if (!confirm(t('admin.form.confirmDelete'))) {
			event.preventDefault();
		}
	}
</script>

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
			disabled
		/>
	</label>
	<label class="form-label">
		{t('admin.form.target')}
		<input
			class="form-input block"
			type="text"
			name="target"
			placeholder={t('admin.form.targetPlaceholder')}
			value={data.contactForm.target}
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
			placeholder="From"
			bind:checked={displayFrom}
		/>
		{t('admin.form.displayFromField')}
	</label>
	{#if displayFrom}
		<label class="checkbox-label">
			<input
				class="form-checkbox"
				type="checkbox"
				name="prefillWithSession"
				checked={data.contactForm.prefillWithSession}
			/>
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
				value={data.contactForm.disclaimer?.label}
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
				value={data.contactForm.disclaimer?.content}
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
				value={data.contactForm.disclaimer?.checkboxLabel}
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
			value={data.contactForm.subject}
			required
		/>
	</label>
	{t('admin.form.content')}

	<textarea
		name="content"
		cols="30"
		rows="10"
		maxlength={MAX_CONTENT_LIMIT}
		value={data.contactForm.content}
		placeholder={t('admin.form.messagePlaceholder')}
		class="form-input block w-full"
	/>
	<div class="flex flex-row justify-between gap-2">
		<input
			type="submit"
			class="btn btn-blue text-white"
			formaction="?/update"
			value={t('admin.action.update')}
		/>
		<a href="/form/{data.contactForm._id}" class="btn body-mainCTA">{t('admin.form.view')}</a>

		<input
			type="submit"
			class="btn btn-red text-white ml-auto"
			formaction="?/delete"
			value={t('admin.form.delete')}
			on:click={confirmDelete}
		/>
	</div>
</form>
