<script lang="ts">
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	export let data;
</script>

<h1 class="text-3xl">{t('admin.cms.bulkSeoEditTitle')}</h1>

<form class="flex flex-col gap-2" method="post">
	{#each data.cmsPages as cmsPage}
		<h2 class="text-2xl">{cmsPage._id}</h2>
		<div class="gap-2 mx-4">
			<label class="w-full form-label">
				{t('admin.cms.pageTitleLabel')}
				<input
					class="form-input"
					type="text"
					name="{cmsPage._id}.title"
					placeholder={t('admin.cms.titlePlaceholder')}
					value={cmsPage.title}
				/>
			</label>

			<label class="w-full form-label">
				{t('admin.cms.shortDescription')}
				<textarea
					class="form-input"
					cols="30"
					rows="5"
					name="{cmsPage._id}.shortDescription"
					placeholder={t('admin.cms.shortDescriptionPlaceholder')}
					value={cmsPage.shortDescription ?? ''}
				/>
			</label>
		</div>
	{/each}

	<button class="btn btn-black self-start mt-4" type="submit">{t('admin.action.update')}</button>
</form>
