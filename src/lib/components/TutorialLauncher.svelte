<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { startTour } from '$lib/tutorials/start';
	import { goto } from '$app/navigation';

	let launched: string | null = null;

	onMount(() => {
		const id = $page.url.searchParams.get('tutorial');
		if (id && launched !== id) {
			launched = id;
			startTour(id);
			// Clean up URL so reloads don't re-trigger
			const clean = new URL($page.url);
			clean.searchParams.delete('tutorial');
			goto(clean.pathname + clean.search, { replaceState: true, noScroll: true, keepFocus: true });
		}
	});
</script>
