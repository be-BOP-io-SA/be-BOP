<script lang="ts">
	import { MAX_NAME_LIMIT } from '$lib/types/Product';
	import { generateId } from '$lib/utils/generateId';
	import PictureComponent from '$lib/components/Picture.svelte';
	import { useI18n } from '$lib/i18n';

	export let data;
	let name = data.slider.title;
	let slug = data.slider._id;

	const { t } = useI18n();

	function confirmDelete(event: Event) {
		if (!confirm(t('admin.slider.confirmDelete'))) {
			event.preventDefault();
		}
	}
</script>

<h1 class="text-3xl">{t('admin.slider.editSlider')}</h1>

<form method="post" class="flex flex-col gap-4" action="?/update">
	<label class="form-label">
		{t('admin.slider.slug')}
		<input
			class="form-input block"
			type="text"
			name="slug"
			placeholder={t('admin.slider.slug')}
			bind:value={slug}
			title={t('admin.slider.slugFormatHint')}
			required
			disabled
		/>
	</label>
	<label class="form-label">
		{t('admin.slider.sliderTitle')}
		<input
			class="form-input"
			type="text"
			maxlength={MAX_NAME_LIMIT}
			name="title"
			placeholder={t('admin.slider.sliderNamePlaceholder')}
			bind:value={name}
			on:change={() => (slug = generateId(name, true))}
			on:input={() => (slug = generateId(name, true))}
			required
		/>
	</label>
	<h2 class="text-2xl my-4">{t('admin.slider.photos')}</h2>

	<div class="flex flex-row flex-wrap gap-6">
		{#each data.pictures as picture}
			<div class="flex flex-col text-center">
				<a href="/admin/picture/{picture._id}" class="flex flex-col items-center">
					<PictureComponent {picture} class="h-36 block" style="object-fit: scale-down;" />
					<span>{picture._id} </span>
				</a>
			</div>
		{/each}
	</div>
	<a href="/admin/picture/new?sliderId={data.slider._id}" class="underline"
		>{t('admin.slider.addPicture')}</a
	>
	{#each [...data.pictures] as slidePicture, i}
		{#if slidePicture.slider}
			<div class="flex flex-col">
				<input type="hidden" name="slideLinks[{i}].idPicture" bind:value={slidePicture._id} />
				<label class="form-label">
					{t('admin.slider.slideUrl', { id: slidePicture._id })}
					<input
						type="text"
						name="slideLinks[{i}].href"
						class="form-input"
						bind:value={slidePicture.slider.url}
					/>
				</label>
				<label class="checkbox-label">
					<input
						class="form-checkbox"
						type="checkbox"
						name="slideLinks[{i}].newTab"
						bind:checked={slidePicture.slider.openNewTab}
					/>
					{t('admin.slider.openInNewTab')}
				</label>
			</div>
		{/if}
	{/each}
	<div class="flex flex-row justify-between gap-2">
		<input type="submit" class="btn btn-blue text-white" value={t('admin.action.update')} />
		<a href="/slider/{data.slider._id}" class="btn body-mainCTA">{t('admin.slider.view')}</a>

		<input
			type="submit"
			class="btn btn-red text-white ml-auto"
			formaction="?/delete"
			value={t('admin.slider.delete')}
			on:click={confirmDelete}
		/>
	</div>
</form>
