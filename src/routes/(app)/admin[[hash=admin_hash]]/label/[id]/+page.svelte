<script lang="ts">
	import { MAX_CONTENT_LIMIT } from '$lib/types/CmsPage.js';
	import { MAX_NAME_LIMIT } from '$lib/types/Product';
	import { generateId } from '$lib/utils/generateId';
	import { useI18n } from '$lib/i18n';

	export let data;
	let name = data.label.name;
	let slug = data.label._id;

	const { t } = useI18n();

	function confirmDelete(event: Event) {
		if (!confirm(t('admin.label.confirmDeleteLabel'))) {
			event.preventDefault();
		}
	}
</script>

<form method="post" class="flex flex-col gap-4">
	<label class="form-label">
		{t('admin.label.name')}
		<input
			class="form-input"
			type="text"
			maxlength={MAX_NAME_LIMIT}
			name="name"
			placeholder={t('admin.label.namePlaceholder')}
			bind:value={name}
			on:change={() => (slug = generateId(name, true))}
			on:input={() => (slug = generateId(name, true))}
			required
		/>
	</label>

	<label class="form-label">
		{t('admin.label.slug')}
		<input
			class="form-input block"
			type="text"
			name="slug"
			placeholder={t('admin.label.slugPlaceholder')}
			bind:value={slug}
			title={t('admin.label.slugTitle')}
			disabled
		/>
	</label>
	<label class="form-label">
		{t('admin.label.color')}
		<input
			class="form-input block"
			type="color"
			name="color"
			placeholder="#000000"
			value={data.label.color}
		/>
	</label>

	<label class="form-label">
		{t('admin.label.content')}

		<textarea
			name="icon"
			cols="30"
			rows="5"
			maxlength={MAX_CONTENT_LIMIT}
			value={data.label.icon}
			class="form-input block w-full"
		/>
	</label>

	<div class="flex flex-row justify-between gap-2">
		<input
			type="submit"
			class="btn btn-blue text-white"
			formaction="?/update"
			value={t('admin.action.update')}
		/>
		<a href="/label/{data.label._id}" class="btn body-mainCTA">{t('admin.label.view')}</a>

		<input
			type="submit"
			class="btn btn-red text-white ml-auto"
			formaction="?/delete"
			value={t('admin.label.delete')}
			on:click={confirmDelete}
		/>
	</div>
</form>
