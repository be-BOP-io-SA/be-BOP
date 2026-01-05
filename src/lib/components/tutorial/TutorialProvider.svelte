<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Tutorial } from '$lib/types/Tutorial';
	import type { TutorialProgress } from '$lib/types/TutorialProgress';

	export let tutorial: Tutorial | null = null;
	export let progress: TutorialProgress | null = null;
	export let adminPrefix: string = '/admin';

	onMount(() => {
		console.log('[Tutorial] onMount - minimal version', { tutorial: !!tutorial });
	});
</script>

<slot />
