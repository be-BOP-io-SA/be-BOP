<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { useI18n } from '$lib/i18n';

	let timeoutId: ReturnType<typeof setInterval>;
	onMount(() => {
		timeoutId = setTimeout(() => {
			goto('/pos/customer-touch/welcome');
		}, 30000);
	});
	onDestroy(() => {
		if (timeoutId) {
			clearTimeout(timeoutId);
		}
	});
	const { t } = useI18n();
</script>

<div class="mx-auto max-w-7xl flex flex-col items-center justify-center p-2">
	<h1 class="text-4xl font-bold text-gray-900 mb-10 text-center">
		{t('customerTouch.deletedOrderTitle')}
	</h1>

	<div
		class="w-full bg-[#f0f0f0] rounded-xl p-8 flex items-center justify-center text-center font-semibold text-gray-700 text-xl md:text-2xl"
	>
		CMS Content<br />/touch-drop
	</div>
</div>
