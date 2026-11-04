<script lang="ts">
	import { typedEntries } from '$lib/utils/typedEntries.js';
	import { useI18n } from '$lib/i18n';

	export let data;
	export let form;

	const { t } = useI18n();

	$: zippedTemplates = typedEntries(data.defaultTemplates).map(([key, template]) => {
		const refused = form?.superAdminOnly && form.key === key ? form : undefined;
		return {
			key,
			subject: refused ? refused.subject : data.templates[key]?.subject,
			defaultSubject: template.subject,
			html: refused ? refused.html : data.templates[key]?.html,
			defaultHtml: template.html,
			isDefault: data.templates[key]?.default,
			superAdminOnly: !!refused || data.superAdminOnlyKeys.includes(key)
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
		{#if data.resetTemplates[template.key]}
			<div
				class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800"
				role="alert"
			>
				<p>{t('admin.template.resetForSafetyNotice')}</p>
				<details class="mt-2">
					<summary class="cursor-pointer">{t('admin.template.previousContent')}</summary>
					<p class="mt-2 font-bold">{data.resetTemplates[template.key].subject ?? ''}</p>
					<pre class="whitespace-pre-wrap text-sm">{data.resetTemplates[template.key].html ??
							''}</pre>
				</details>
				{#if !template.superAdminOnly}
					<button type="submit" class="btn btn-black mt-2" formaction="?/dismissResetNotice"
						>{t('admin.template.dismissResetNotice')}</button
					>
				{/if}
			</div>
		{/if}
		{#if template.superAdminOnly}
			<p class="text-gray-600">{t('admin.template.superAdminOnly')}</p>
		{/if}
		<label class="form-label">
			{t('admin.template.subject')}
			<input
				type="text"
				name="subject"
				placeholder={template.defaultSubject}
				value={template.subject}
				class="form-input"
				readonly={template.superAdminOnly}
			/>
		</label>
		<label class="form-label">
			{t('admin.template.htmlBody')}
			<textarea
				name="html"
				class="form-input"
				rows={5}
				placeholder={template.defaultHtml}
				readonly={template.superAdminOnly}>{template.html}</textarea
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
			<button
				type="submit"
				class="btn btn-black"
				formaction="?/update"
				disabled={template.superAdminOnly}>{t('admin.action.update')}</button
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
				disabled={template.isDefault || template.superAdminOnly}
				>{t('admin.template.resetToDefault')}</button
			>
		</div>
	</form>
{/each}
