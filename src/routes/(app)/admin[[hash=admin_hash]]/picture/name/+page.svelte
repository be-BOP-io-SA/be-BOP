<script lang="ts">
	import { useI18n } from '$lib/i18n';

	export let data;
	const { t } = useI18n();
</script>

<h1 class="text-3xl">{t('admin.picture.bulkNameChangeTitle')}</h1>

<form class="flex flex-col gap-2" method="post">
	{#each data.pictures as picture}
		<h2 class="text-2xl">{picture.name}</h2>
		<div class="gap-4 mx-4 flex flex-col md:flex-row">
			<label class="w-full">
				{t('admin.picture.currentSlug')}
				<input class="form-input" type="text" placeholder="slug" value={picture._id} disabled />
			</label>

			<label class="w-full">
				{t('admin.picture.name')}
				<input
					class="form-input"
					type="text"
					name="{picture._id}.name"
					placeholder={t('admin.picture.namePlaceholder')}
					value={picture.name ?? ''}
				/>
			</label>
		</div>
	{/each}
	<button class="btn btn-black self-start mt-4" type="submit">{t('admin.action.update')}</button>
</form>
