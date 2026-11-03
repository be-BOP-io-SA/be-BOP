<script lang="ts">
	import { typedEntries } from '$lib/utils/typedEntries.js';
	import { useI18n } from '$lib/i18n';

	export let data;

	const { t } = useI18n();

	$: zippedTemplates = typedEntries(data.defaultTemplates).map(([key, template]) => {
		return {
			key,
			subject: data.templates[key]?.subject,
			defaultSubject: template.subject,
			html: data.templates[key]?.html,
			defaultHtml: template.html,
			isDefault: data.templates[key]?.default
		};
	});
</script>

<p>
	<kbd class="kbd body-secondaryCTA">{'{{websiteLink}}'}</kbd>,
	<kbd class="kbd body-secondaryCTA">{'{{brandName}}'}</kbd>,
	<kbd class="kbd body-secondaryCTA">{'{{iban}}'}</kbd>
	{t('admin.template.and')} <kbd class="kbd body-secondaryCTA">{'{{bic}}'}</kbd>
	{t('admin.template.areAlwaysAvailable')}
</p>
<p>
	{t('admin.template.forOrders')} <kbd class="kbd body-secondaryCTA">{'{{orderNumber}}'}</kbd>,
	<kbd class="kbd body-secondaryCTA">{'{{orderLink}}'}</kbd>,
	<kbd class="kbd body-secondaryCTA">{'{{invoiceLink}}'}</kbd>,
	<kbd class="kbd body-secondaryCTA">{'{{amount}}'}</kbd>,
	<kbd class="kbd body-secondaryCTA">{'{{currency}}'}</kbd>,
	<kbd class="kbd body-secondaryCTA">{'{{paymentStatus}}'}</kbd>,
	<kbd class="kbd body-secondaryCTA">{'{{paymentLink}}'}</kbd>,
	<kbd class="kbd body-secondaryCTA">{'{{qrcodeLink}}'}</kbd>
	{t('admin.template.areAlsoAvailable')}
</p>
{#each zippedTemplates as template}
	<form class="contents" method="post">
		<h2 class="text-2xl">{template.key}</h2>
		<input type="hidden" name="key" value={template.key} />
		<label class="form-label">
			{t('admin.template.subject')}
			<input
				type="text"
				name="subject"
				placeholder={template.defaultSubject}
				value={template.subject}
				class="form-input"
			/>
		</label>
		<label class="form-label">
			{t('admin.template.htmlBody')}
			<textarea name="html" class="form-input" rows={5} placeholder={template.defaultHtml}
				>{template.html}</textarea
			>
		</label>
		{#if template.isDefault}
			<p class="text-gray-600 -mt-4">
				{t('admin.template.defaultTemplateHint')}
			</p>
		{:else}
			<p class="text-gray-600 -mt-4">
				{t('admin.template.customTemplateHint')}
			</p>
		{/if}
		<div class="flex justify-start gap-2">
			<button type="submit" class="btn btn-black" formaction="?/update"
				>{t('admin.action.update')}</button
			>
			<button
				type="submit"
				class="btn body-mainCTA"
				formaction="?/reset"
				on:click={(e) => {
					if (!confirm(t('admin.template.confirmResetToDefault'))) {
						e.preventDefault();
					}
				}}
				disabled={template.isDefault}>{t('admin.template.resetToDefault')}</button
			>
		</div>
	</form>
{/each}
