<script lang="ts">
	import { useI18n } from '$lib/i18n';
	import PriceTag from '$lib/components/PriceTag.svelte';

	export let data;
	export let form;

	const { t } = useI18n();

	let cashClosingAmount: number | null = null;
	let bankDepositAmount: number | null = 0;
	let justification = '';

	// The same count as /pos/closing: opening cash, plus cash taken, minus what left the drawer.
	$: expected =
		data.enabled && data.session
			? data.session.cashOpening.amount +
			  (data.cashIncome ?? 0) -
			  (bankDepositAmount ?? 0) -
			  (data.cashbackTotal ?? 0)
			: 0;
	$: delta = (cashClosingAmount ?? 0) - expected;
	$: hasDelta = cashClosingAmount !== null && Math.abs(delta) > 0.01;
	$: justificationRequired =
		data.enabled && !!data.session && data.justificationMandatory && hasDelta;
</script>

<main class="min-h-screen flex flex-col items-center gap-4 p-4 body-mainPlan">
	<h1 class="text-2xl">{t('pos.terminal.till.title')}</h1>

	{#if form && 'zTicket' in form}
		<p class="text-green-600 font-semibold">{t('pos.terminal.till.closed')}</p>
		<pre class="whitespace-pre-wrap text-sm w-full max-w-md">{form.zTicket}</pre>
	{:else if !data.enabled}
		<p class="text-center max-w-sm">{t('pos.terminal.till.notEnabled')}</p>
	{:else}
		{#if form && 'tillError' in form}
			<p class="text-red-500" role="alert">{t(`pos.terminal.till.errors.${form.tillError}`)}</p>
		{/if}
		{#if !data.session}
			<form method="post" action="?/open" class="flex flex-col gap-3 w-full max-w-sm">
				{#if data.forbidTouchWhenClosed}
					<p class="text-center" role="alert">{t('pos.terminal.errors.tillClosed')}</p>
				{/if}
				<button type="submit" class="btn body-mainCTA text-xl py-4">
					{t('pos.terminal.till.open')}
				</button>
			</form>
		{:else}
			<form method="post" action="?/close" class="flex flex-col gap-3 w-full max-w-sm">
				<p class="text-sm opacity-70">
					{t('pos.terminal.till.openingCash')}
					<PriceTag
						inline
						amount={data.session.cashOpening.amount}
						currency={data.session.cashOpening.currency}
					/>
				</p>
				<label class="form-label">
					{t('pos.terminal.till.bankDeposit')} ({data.session.cashOpening.currency})
					<input
						type="number"
						inputmode="decimal"
						step="0.01"
						min="0"
						name="bankDepositAmount"
						class="form-input text-xl"
						bind:value={bankDepositAmount}
						required
					/>
				</label>
				<label class="form-label">
					{t('pos.terminal.till.cashCounted')} ({data.session.cashOpening.currency})
					<input
						type="number"
						inputmode="decimal"
						step="0.01"
						min="0"
						name="cashClosingAmount"
						class="form-input text-xl"
						bind:value={cashClosingAmount}
						required
					/>
				</label>
				<p>
					{t('pos.terminal.till.expected')}
					<PriceTag inline amount={expected} currency={data.session.cashOpening.currency} />
				</p>
				{#if hasDelta}
					<p class="text-red-600">
						{t('pos.terminal.till.delta')}
						<PriceTag inline amount={delta} currency={data.session.cashOpening.currency} />
					</p>
					<label class="form-label">
						{justificationRequired
							? t('pos.terminal.till.justificationRequired')
							: t('pos.terminal.till.justification')}
						<textarea
							name="justification"
							class="form-input"
							rows="3"
							bind:value={justification}
							required={justificationRequired}
						></textarea>
					</label>
				{/if}
				<button type="submit" class="btn body-mainCTA text-xl py-4">
					{t('pos.terminal.till.close')}
				</button>
			</form>
		{/if}
	{/if}

	{#if !(data.enabled && !data.session && data.forbidTouchWhenClosed)}
		<a href="/pos/terminal" class="btn btn-gray w-full max-w-sm text-xl py-4"
			>{t('pos.terminal.back')}</a
		>
	{/if}
</main>
