<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { beforeNavigate, afterNavigate, goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Shepherd from 'shepherd.js';
	import { tutorialStore } from '$lib/stores/tutorial';
	import { useI18n } from '$lib/i18n';
	import type { Tutorial } from '$lib/types/Tutorial';
	import type { TutorialProgress } from '$lib/types/TutorialProgress';

	export let tutorial: Tutorial | null = null;
	export let progress: TutorialProgress | null = null;
	export let adminPrefix: string = '/admin';

	const { t } = useI18n();
	let tour: Shepherd.Tour | null = null;
	let isNavigating = false;
	let pendingStepIndex: number | null = null;

	beforeNavigate(() => {
		console.log('[Tutorial] beforeNavigate');
	});

	afterNavigate(() => {
		console.log('[Tutorial] afterNavigate');
	});

	onMount(() => {
		console.log('[Tutorial] onMount', { tutorial: !!tutorial, isActive: $tutorialStore.isActive });
	});
</script>

<slot />
