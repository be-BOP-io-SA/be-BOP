<script lang="ts">
	import { page } from '$app/stores';

	export let param: string;
	export let current: number;
	export let pageCount: number;
	export let total: number;

	function pageHref(pageNumber: number) {
		const searchParams = new URLSearchParams($page.url.searchParams);
		searchParams.set(param, String(pageNumber));
		return `?${searchParams}`;
	}
</script>

<div class="flex items-center gap-3 mt-2 text-sm">
	<span>{total} rows</span>
	{#if pageCount > 1}
		{#if current > 1}
			<a class="underline body-hyperlink" href={pageHref(current - 1)} data-sveltekit-noscroll
				>← Previous</a
			>
		{/if}
		<span>Page {current} / {pageCount}</span>
		{#if current < pageCount}
			<a class="underline body-hyperlink" href={pageHref(current + 1)} data-sveltekit-noscroll
				>Next →</a
			>
		{/if}
	{/if}
</div>
