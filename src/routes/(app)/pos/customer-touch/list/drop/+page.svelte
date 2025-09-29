<script>
	import { goto } from '$app/navigation';
	import { useI18n } from '$lib/i18n';
	const { t } = useI18n();
</script>

<div class="max-w-full flex flex-col items-center justify-center p-2">
	<h1 class="text-4xl font-bold text-gray-900 mb-10 text-center">
		{t('customerTouch.cancelOrderTitlle')}
	</h1>

	<div class="w-full flex flex-col gap-4 mb-12">
		<button
			on:click={() => goto('/pos/customer-touch/list/home')}
			class="bg-[#8fd16a] font-bold py-5 rounded-lg text-2xl w-full shadow-md hover:opacity-90 transition-opacity duration-200"
		>
			{t('customerTouch.cta.resumeOrder')}
		</button>
		<button
			on:click={() => goto('/pos/customer-touch/dropped')}
			class="bg-[#f47c8c] text-white font-bold py-5 rounded-lg text-2xl w-full shadow-md hover:opacity-90 transition-opacity duration-200"
		>
			{t('customerTouch.cta.abandonment')} !
		</button>
	</div>

	<div
		class="w-full bg-[#f0f0f0] rounded-xl p-8 flex items-center justify-center text-center font-semibold text-gray-700 text-xl md:text-2xl"
	>
		CMS Content / touch-drop-confirm
	</div>
</div>
