<script lang="ts">
	import { MAX_CONTENT_LIMIT } from '$lib/types/CmsPage';
	import { MAX_NAME_LIMIT } from '$lib/types/Product';
	import { generateId } from '$lib/utils/generateId';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	let title = '';
	let slug = '';
</script>

<h1 class="text-3xl">{t('admin.specification.addTitle')}</h1>

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
			required
		/>
	</label>
	{t('admin.specification.content')}

	<textarea
		name="content"
		cols="30"
		rows="10"
		maxlength={MAX_CONTENT_LIMIT}
		placeholder={t('admin.specification.contentPlaceholder')}
		class="form-input block w-full"
	/>
	<input
		type="submit"
		class="btn btn-blue self-start text-white"
		value={t('admin.specification.submit')}
	/>
</form>
