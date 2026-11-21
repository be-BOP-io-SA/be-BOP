<script lang="ts">
	import { useI18n } from '$lib/i18n';
	import { FRACTION_DIGITS_PER_CURRENCY } from '$lib/types/Currency';

	export let data;

	const { t, locale } = useI18n();

	// Typed as on a card terminal: each digit shifts in from the right, the last ones are decimals.
	let digits = '';
	const MAX_DIGITS = 12;

	$: fractionDigits = data.paired ? FRACTION_DIGITS_PER_CURRENCY[data.currency] : 0;
	$: amount = Number(digits || '0') / 10 ** fractionDigits;
	$: displayed = amount.toLocaleString($locale, {
		minimumFractionDigits: fractionDigits,
		maximumFractionDigits: fractionDigits
	});

	function press(key: string) {
		if (key === 'erase') {
			digits = digits.slice(0, -1);
		} else if (digits.length < MAX_DIGITS && !(digits === '' && key.startsWith('0'))) {
			digits = (digits + key).slice(0, MAX_DIGITS);
		}
	}

	const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'erase'];
</script>

<main class="min-h-screen flex flex-col items-center justify-center gap-6 p-4 body-mainPlan">
	{#if data.paired}
		<p class="text-sm opacity-70">{data.deviceName}</p>
		<label class="flex flex-col items-center gap-2 w-full max-w-sm">
			<span class="text-lg">{t('pos.terminal.amount')}</span>
			<output class="text-5xl font-semibold tabular-nums" aria-live="polite">
				{displayed}
				{data.currency}
			</output>
		</label>
		<div class="grid grid-cols-3 gap-3 w-full max-w-sm">
			{#each KEYS as key}
				<button
					type="button"
					class="btn btn-gray text-2xl py-4"
					on:click={() => press(key)}
					aria-label={key === 'erase' ? t('pos.terminal.erase') : key}
				>
					{key === 'erase' ? '⌫' : key}
				</button>
			{/each}
		</div>
		<!-- The payment itself is the next step of be-BOP-pos: the button waits for it. -->
		<button type="button" class="btn body-mainCTA w-full max-w-sm text-xl py-4" disabled>
			{t('pos.terminal.next')}
		</button>
	{:else}
		<p class="text-xl text-center">{t('pos.terminal.notPaired')}</p>
	{/if}
</main>
