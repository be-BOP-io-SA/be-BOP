<script lang="ts">
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	export let data;
</script>

<a href="{data.adminPrefix}/specification/new" class="underline block"
	>{t('admin.specification.addSpecification')}</a
>

<h1 class="text-3xl">{t('admin.specification.listTitle')}</h1>

<ul>
	{#each data.specifications as specification}
		<li>
			{specification._id} -
			<a
				href="{data.adminPrefix}/specification/{specification._id}"
				class="underline body-hyperlink">{specification.title}</a
			>
		</li>
	{:else}
		{t('admin.specification.noSpecificationYet')}
	{/each}
</ul>
