<script lang="ts">
	import { useI18n } from '$lib/i18n';

	export let data;

	const { t } = useI18n();
</script>

<a href="{data.adminPrefix}/label/new" class="underline block">{t('admin.label.addLabel')}</a>

<h1 class="text-3xl">{t('admin.label.listOfLabel')}</h1>

<ul>
	{#each data.labels as label}
		<li>
			{label._id} -
			<a href="{data.adminPrefix}/label/{label._id}" class="underline body-hyperlink"
				>{label.name}</a
			>
		</li>
	{:else}
		{t('admin.label.noLabelYet')}
	{/each}
</ul>
