<script lang="ts">
	import { MAX_CONTENT_LIMIT } from '$lib/types/CmsPage';
	import { MAX_NAME_LIMIT } from '$lib/types/Product';
	import { generateId } from '$lib/utils/generateId';
	import { useI18n } from '$lib/i18n';

	let name = '';
	let slug = '';

	const { t } = useI18n();
</script>

<h1 class="text-3xl">{t('admin.label.addLabel')}</h1>

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
			required
		/>
	</label>

	<label class="form-label">
		{t('admin.label.color')}
		<input class="form-input block" type="color" name="color" placeholder="#000000" required />
	</label>

	{t('admin.label.icon')}
	<label class="form-label">
		<textarea
			name="icon"
			cols="30"
			rows="5"
			maxlength={MAX_CONTENT_LIMIT}
			placeholder={t('admin.label.iconPlaceholder')}
			class="form-input block w-full"
		/>
	</label>
	<input type="submit" class="btn btn-blue self-start text-white" value={t('admin.label.submit')} />
</form>
