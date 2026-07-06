<script lang="ts">
	import { useI18n } from '$lib/i18n';

	export let data;

	const { t } = useI18n();
</script>

<a href="{data.adminPrefix}/searchlist/new" class="underline block">{t('admin.searchlist.add')}</a>

<h1 class="text-3xl">{t('admin.searchlist.title')}</h1>
<ul>
	{#each data.searchlists as searchlist}
		<li>
			<a href="{data.adminPrefix}/searchlist/{searchlist._id}" class="underline text-blue">
				{searchlist.name}
			</a>
			{#if searchlist.disabled}
				<span class="text-xs bg-gray-500 text-white px-2 py-0.5 rounded ml-1"
					>{t('admin.searchlist.disabled')}</span
				>
			{/if}
			-
			<span class="text-gray-550">[Searchlist={searchlist._id}]</span>
		</li>
	{:else}
		{t('admin.searchlist.empty')}
	{/each}
</ul>
