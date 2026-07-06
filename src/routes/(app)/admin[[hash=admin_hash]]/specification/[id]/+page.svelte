<script lang="ts">
	import { MAX_CONTENT_LIMIT } from '$lib/types/CmsPage.js';
	import { MAX_NAME_LIMIT } from '$lib/types/Product';
	import { generateId } from '$lib/utils/generateId';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	export let data;
	let title = data.specification.title;
	let slug = data.specification._id;
	function confirmDelete(event: Event) {
		if (!confirm(t('admin.specification.confirmDelete'))) {
			event.preventDefault();
		}
	}
</script>

<form method="post" class="flex flex-col gap-4">
	<label class="form-label">
		{t('admin.specification.title')}
		<input
			class="form-input"
			type="text"
			maxlength={MAX_NAME_LIMIT}
			name="title"
			placeholder={t('admin.specification.titlePlaceholder')}
			bind:value={title}
			on:change={() => (slug = generateId(title, true))}
			on:input={() => (slug = generateId(title, true))}
			required
		/>
	</label>

	<label class="form-label">
		{t('admin.specification.slug')}
		<input
			class="form-input block"
			type="text"
			name="slug"
			placeholder={t('admin.specification.slugPlaceholder')}
			bind:value={slug}
			title={t('admin.specification.slugHint')}
			disabled
		/>
	</label>
	{t('admin.specification.content')}

	<textarea
		name="content"
		cols="30"
		rows="10"
		maxlength={MAX_CONTENT_LIMIT}
		value={data.specification.content}
		placeholder={t('admin.specification.contentPlaceholder')}
		class="form-input block w-full"
	/>
	<div class="flex flex-row justify-between gap-2">
		<input
			type="submit"
			class="btn btn-blue text-white"
			formaction="?/update"
			value={t('admin.action.update')}
		/>
		<a href="/specification/{data.specification._id}" class="btn body-mainCTA"
			>{t('admin.specification.view')}</a
		>

		<input
			type="submit"
			class="btn btn-red text-white ml-auto"
			formaction="?/delete"
			value={t('admin.specification.delete')}
			on:click={confirmDelete}
		/>
	</div>
</form>
