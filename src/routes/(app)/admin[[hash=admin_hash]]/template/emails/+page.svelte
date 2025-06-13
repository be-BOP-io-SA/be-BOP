<script lang="ts">
	import { typedEntries } from '$lib/utils/typedEntries.js';

	export let data;

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
	and <kbd class="kbd body-secondaryCTA">{'{{bic}}'}</kbd> are always available in templates.
</p>
<p>
	For orders, <kbd class="kbd body-secondaryCTA">{'{{orderNumber}}'}</kbd>,
	<kbd class="kbd body-secondaryCTA">{'{{orderLink}}'}</kbd>,
	<kbd class="kbd body-secondaryCTA">{'{{invoiceLink}}'}</kbd>,
	<kbd class="kbd body-secondaryCTA">{'{{amount}}'}</kbd>,
	<kbd class="kbd body-secondaryCTA">{'{{currency}}'}</kbd>,
	<kbd class="kbd body-secondaryCTA">{'{{paymentStatus}}'}</kbd>,
	<kbd class="kbd body-secondaryCTA">{'{{paymentLink}}'}</kbd>,
	<kbd class="kbd body-secondaryCTA">{'{{qrcodeLink}}'}</kbd> are also available.
</p>
{#each zippedTemplates as template}
	<form class="contents" method="post">
		<h2 class="text-2xl">{template.key}</h2>
		<input type="hidden" name="key" value={template.key} />
		<label class="form-label">
			Subject
			<input
				type="text"
				name="subject"
				placeholder={template.defaultSubject}
				value={template.subject}
				class="form-input"
			/>
		</label>
		<label class="form-label">
			HTML body
			<textarea name="html" class="form-input" rows={5} placeholder={template.defaultHtml}
				>{template.html}</textarea
			>
		</label>
		{#if template.isDefault}
			<p class="text-gray-600 -mt-4">
				This is the default template. If you leave it as is, it will keep being updated as the
				codebase changes.
			</p>
		{:else}
			<p class="text-gray-600 -mt-4">
				This is a custom template. If you leave it as is, it will not be updated as the codebase
				changes. To see the latest changes, you can erase the values.
			</p>
		{/if}
		<div class="flex justify-start gap-2">
			<button type="submit" class="btn btn-black" formaction="?/update">Update</button>
			<button
				type="submit"
				class="btn body-mainCTA"
				formaction="?/reset"
				on:click={(e) => {
					if (!confirm('Are you sure you want to reset this template to the default?')) {
						e.preventDefault();
					}
				}}
				disabled={template.isDefault}>Reset to default</button
			>
		</div>
	</form>
{/each}
