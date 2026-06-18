<script lang="ts">
	import Searchlist from '$lib/components/Searchlist.svelte';

	export let data;
</script>

<svelte:head>
	<title>{data.searchlist.name}</title>
</svelte:head>

<main class="mx-auto max-w-7xl flex flex-col gap-4 px-6 py-10 body-mainPlan">
	{#if data.searchlist.displayWidgetName}
		<h1 class="page-title body-title">{data.searchlist.name}</h1>
	{/if}
	<Searchlist
		searchlist={data.searchlist}
		state={data.state}
		products={data.products}
		picturesByProductId={data.picturesByProductId}
		digitalFilesByProductId={data.digitalFilesByProductId}
		hasPosOptions={!!data.hasPosOptions}
		total={data.total}
		totalPages={data.totalPages}
		basePath={data.basePath}
		allowedTags={data.allowedTags}
		displayVatIncluded={data.displayVatIncluded}
	/>
</main>
