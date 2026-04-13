<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { startTour } from '$lib/tutorials/start';
	import { goto } from '$app/navigation';

	let launched: string | null = null;

	const progressMap: Record<string, { course: string; step: string }> = {
		adminHashDone: { course: 'onboarding', step: 'config-done' },
		armUserSaved: { course: 'onboarding', step: 'arm-nostr-intro' }
	};

	onMount(() => {
		const id = $page.url.searchParams.get('tutorial');
		if (id && launched !== id) {
			launched = id;
			startTour(id);
			const clean = new URL($page.url);
			clean.searchParams.delete('tutorial');
			goto(clean.pathname + clean.search, { replaceState: true, noScroll: true, keepFocus: true });
			return;
		}

		const progress = sessionStorage.getItem('tutorial_progress');
		if (progress) {
			sessionStorage.removeItem('tutorial_progress');
			const target = progressMap[progress];
			if (target) {
				startTour(target.course, target.step);
			}
		}
	});
</script>
