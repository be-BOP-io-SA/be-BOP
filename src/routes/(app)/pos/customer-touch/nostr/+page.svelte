<script lang="ts">
	import { goto } from '$app/navigation';
	import IconBack from '$lib/components/icons/IconBack.svelte';
	import { useI18n } from '$lib/i18n';
	import { onDestroy, onMount } from 'svelte';

	const { t } = useI18n();
	const IDLE_TIMEOUT_MS = 30 * 1000;
	let idleTimer: ReturnType<typeof setInterval>;

	function redirectToWelcome() {
		goto('/pos/customer-touch/welcome');
	}

	function resetIdleTimer() {
		if (idleTimer) {
			clearTimeout(idleTimer);
		}
		idleTimer = setTimeout(redirectToWelcome, IDLE_TIMEOUT_MS);
	}

	function handleUserActivity() {
		resetIdleTimer();
	}

	onMount(() => {
		resetIdleTimer();

		window.addEventListener('mousemove', handleUserActivity);
		window.addEventListener('keydown', handleUserActivity);
		window.addEventListener('mousedown', handleUserActivity);
		window.addEventListener('touchstart', handleUserActivity);
		window.addEventListener('scroll', handleUserActivity);
	});

	onDestroy(() => {
		if (idleTimer) {
			clearTimeout(idleTimer);
		}
		window.removeEventListener('mousemove', handleUserActivity);
		window.removeEventListener('keydown', handleUserActivity);
		window.removeEventListener('mousedown', handleUserActivity);
		window.removeEventListener('touchstart', handleUserActivity);
		window.removeEventListener('scroll', handleUserActivity);
	});
</script>

<div class="mx-auto max-w-7xl px-8">
	<button
		class="self-start text-gray-800 font-semibold text-lg flex items-center"
		on:click={() => history.back()}
	>
		<IconBack />
		{t('customerTouch.ctaBack')}
	</button>
	<div class="flex flex-col items-center mt-4">
		<h1 class="text-3xl font-bold text-gray-900 mb-4 text-center">Scannez votre Npub</h1>

		<div
			class="w-64 h-64 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-700 font-semibold text-xl mb-4"
		>
			Camera
		</div>
		<input
			type="text"
			placeholder="npubx..."
			class="w-full p-2 bg-gray-100 border-2 border-transparent rounded-lg text-lg text-gray-800 mb-4 placeholder-gray-400"
		/>

		<button
			class="bg-gray-100 font-semibold p-2 rounded-lg text-lg hover:bg-gray-200 transition-colors duration-200"
			on:click={() => goto('/pos/customer-touch/list/home')}
		>
			Continuer
		</button>
	</div>
</div>
