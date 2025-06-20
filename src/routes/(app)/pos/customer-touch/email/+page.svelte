<script lang="ts">
	import IconBack from '$lib/components/icons/IconBack.svelte';
	import { useI18n } from '$lib/i18n';
	const { t } = useI18n();
</script>

<div class="mx-auto max-w-7xl px-8">
	<button
		class="self-start font-semibold text-lg flex items-center"
		on:click={() => history.back()}
	>
		<IconBack />
		{t('customerTouch.ctaBack')}
	</button>

	<div class="w-full flex flex-col items-center mt-12">
		<h1 class="text-3xl font-bold mb-4 text-center">Votre e-mail</h1>

		<input
			type="email"
			placeholder="example@bebop.com"
			class="w-full p-2 bg-gray-100 border-2 border-transparent rounded-lg text-lg text-gray-800 mb-4 placeholder-gray-400"
		/>

		<button
			class=" bg-gray-100 font-semibold p-2 rounded-lg text-lg hover:bg-gray-200 transition-colors duration-200"
		>
			Continuer
		</button>
	</div>
</div>
