<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { tutorialStore } from '$lib/stores/tutorial';
	import { useI18n } from '$lib/i18n';
	import type { Tutorial } from '$lib/types/Tutorial';
	import type { TutorialProgress } from '$lib/types/TutorialProgress';

	export let tutorial: Tutorial | null = null;
	export let progress: TutorialProgress | null = null;
	export let adminPrefix: string = '/admin';

	const { t } = useI18n();

	onMount(() => {
		console.log('[Tutorial] onMount', { tutorial: !!tutorial, isActive: $tutorialStore.isActive });
	});
</script>

<slot />
