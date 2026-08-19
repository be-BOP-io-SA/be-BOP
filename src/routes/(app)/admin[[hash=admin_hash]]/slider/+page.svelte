<script lang="ts">
	import S3NotConfiguredWarning from '$lib/components/S3NotConfiguredWarning.svelte';
	import { useI18n } from '$lib/i18n';

	export let data;

	const { t } = useI18n();
</script>

{#if !data.s3IsConfigured}
	<S3NotConfiguredWarning adminPrefix={data.adminPrefix} />
{/if}

<a href="/admin/slider/new" class="underline block">{t('admin.slider.addSlider')}</a>

<h1 class="text-3xl">{t('admin.slider.listOfSliders')}</h1>

<div class="flex flex-row flex-wrap gap-6">
	<ul>
		{#each data.sliders as slider}
			<li>
				{slider._id} -
				<a href="/admin/slider/{slider._id}" class="underline body-hyperlink">{slider.title}</a>
			</li>
		{:else}
			{t('admin.slider.noSliderYet')}
		{/each}
	</ul>
</div>
