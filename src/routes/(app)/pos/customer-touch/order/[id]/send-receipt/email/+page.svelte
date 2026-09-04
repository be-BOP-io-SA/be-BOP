<script lang="ts">
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();
</script>

<div class="mx-auto max-w-7xl px-8">
	<h1 class="text-3xl font-bold text-gray-900 mb-4 text-center">
		{t('customerTouch.receipt.emailAddressPrompt')}
	</h1>
	<div class="flex flex-col gap-4 w-full">
		<form method="post" class="flex flex-col gap-2 items-center w-full">
			<input
				type="email"
				name="email"
				required
				placeholder="Email"
				class="w-full p-2 bg-gray-100 border-2 border-transparent rounded-lg text-lg text-gray-800 mb-4 placeholder-gray-400"
			/>
			<button
				class="flex w-1/3 justify-center items-center bg-[#8fd16a] font-bold py-4 rounded-lg text-xl shadow-md"
				type="submit"
			>
				{t('customerTouch.receipt.sendEmailCta')}
			</button>
		</form>
	</div>
</div>
