<script lang="ts">
	import { page } from '$app/stores';
	import IconEmail from '$lib/components/icons/IconEmail.svelte';
	import IconNostr from '$lib/components/icons/IconNostr.svelte';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();
</script>

<div class="mx-auto max-w-7xl px-8">
	<h1 class="text-3xl font-bold text-gray-900 mb-4 text-center">
		{t('customerTouch.receipt.howToSend')}
	</h1>
	<div class="flex flex-col gap-4 max-w-md m-auto">
		<a
			href="{$page.url.pathname}/email"
			class="bg-blue-500 text-gray-900 font-semibold py-5 rounded-xl text-xl flex items-center justify-center space-x-2 min-h-[80px]"
		>
			<IconEmail />
			<span>E-mail</span>
		</a>
		<form action="?/nostr" method="POST" class="m-auto w-full">
			<button
				type="submit"
				class="bg-jagger-700 text-white font-semibold py-5 rounded-xl text-xl flex items-center justify-center space-x-2 min-h-[80px] w-full"
			>
				<IconNostr />
				<span>Nostr</span>
			</button>
		</form>
		<button
			on:click={() => history.back()}
			class="bg-red-600 text-white font-bold rounded-3xl text-2xl h-full flex items-center justify-center min-h-[80px]"
		>
			{t('customerTouch.noThanksCta')}
		</button>
	</div>
</div>
