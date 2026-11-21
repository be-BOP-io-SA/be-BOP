<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { useI18n } from '$lib/i18n';
	import { FRACTION_DIGITS_PER_CURRENCY } from '$lib/types/Currency';

	export let data;
	export let form;

	const { t, locale } = useI18n();

	type Step = 'amount' | 'tip' | 'ref' | 'method';
	let step: Step = 'amount';

	// Typed as on a card terminal: each digit shifts in from the right, the last ones are decimals.
	let amountDigits = '';
	let tipDigits = '';
	let externalRef = '';
	const MAX_DIGITS = 12;
	const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'erase'];

	$: fractionDigits = data.paired && !data.locked ? FRACTION_DIGITS_PER_CURRENCY[data.currency] : 0;
	const valueOf = (digits: string, fd: number) => Number(digits || '0') / 10 ** fd;
	$: amount = valueOf(amountDigits, fractionDigits);
	$: tip = valueOf(tipDigits, fractionDigits);
	$: format = (value: number) =>
		value.toLocaleString($locale, {
			minimumFractionDigits: fractionDigits,
			maximumFractionDigits: fractionDigits
		});

	function press(key: string) {
		const digits = step === 'tip' ? tipDigits : amountDigits;
		let next = digits;
		if (key === 'erase') {
			next = digits.slice(0, -1);
		} else if (digits.length < MAX_DIGITS && !(digits === '' && key.startsWith('0'))) {
			next = (digits + key).slice(0, MAX_DIGITS);
		}
		if (step === 'tip') {
			tipDigits = next;
		} else {
			amountDigits = next;
		}
	}

	// Continue skips the tip: going back from the reference then returns to the amount.
	let tipSkipped = false;

	// Lock screen (arm-pos): the operator picks their name, then types their PIN, or taps a badge.
	let operatorId = '';
	let pinDigits = '';
	let badgeForm: HTMLFormElement;
	let badgeInput: HTMLInputElement;
	// The be-BOP-pos app listens for NFC only while the page defines this, and calls it with each
	// badge read: so it exists on the locked screen only, and NFC stays off everywhere else.
	type TerminalHooks = { bebopTerminal?: { badge?: (identifier: string) => void } };
	let mounted = false;
	onMount(() => (mounted = true));
	$: if (mounted) {
		const hooks = window as unknown as TerminalHooks;
		if (data.paired && data.locked) {
			hooks.bebopTerminal = {
				badge(identifier: string) {
					if (badgeForm) {
						badgeInput.value = identifier;
						badgeForm.requestSubmit();
					}
				}
			};
		} else {
			delete hooks.bebopTerminal;
		}
	}
	onDestroy(() => {
		if (typeof window !== 'undefined') {
			delete (window as unknown as TerminalHooks).bebopTerminal;
		}
	});
	function pressPin(key: string) {
		if (key === 'erase') {
			pinDigits = pinDigits.slice(0, -1);
		} else if (pinDigits.length < 8 && key !== '00') {
			pinDigits += key;
		}
	}

	function back() {
		step = step === 'method' ? 'ref' : step === 'ref' && !tipSkipped ? 'tip' : 'amount';
	}
</script>

<main class="min-h-screen flex flex-col items-center justify-center gap-6 p-4 body-mainPlan">
	{#if !data.paired}
		<p class="text-xl text-center">{t('pos.terminal.notPaired')}</p>
	{:else if data.locked}
		<p class="text-sm opacity-70">{data.deviceName}</p>
		<form method="post" action="?/unlock" bind:this={badgeForm} class="hidden">
			<input type="hidden" name="badge" bind:this={badgeInput} />
		</form>
		{#if form?.error}
			<p class="text-red-500 text-center" role="alert">{t(`pos.terminal.errors.${form.error}`)}</p>
		{/if}
		{#if !operatorId}
			<p class="text-xl">{t('pos.terminal.whoAreYou')}</p>
			{#if data.operators.length}
				<div class="grid grid-cols-2 gap-3 w-full max-w-sm">
					{#each data.operators as operator}
						<button
							type="button"
							class="btn btn-gray text-xl py-4"
							on:click={() => {
								operatorId = operator.id;
								pinDigits = '';
							}}
						>
							{operator.alias}
						</button>
					{/each}
				</div>
			{:else}
				<p class="text-center">{t('pos.terminal.noOperator')}</p>
			{/if}
			<p class="text-sm opacity-70">{t('pos.terminal.orBadge')}</p>
		{:else}
			<form
				method="post"
				action="?/unlock"
				class="flex flex-col items-center gap-4 w-full max-w-sm"
			>
				<p class="text-xl">{data.operators.find((o) => o.id === operatorId)?.alias}</p>
				<input type="hidden" name="operatorId" value={operatorId} />
				<input type="hidden" name="pin" value={pinDigits} />
				<output class="text-4xl tracking-widest" aria-label={t('pos.terminal.pin')}>
					{'•'.repeat(pinDigits.length) || '—'}
				</output>
				<div class="grid grid-cols-3 gap-3 w-full">
					{#each KEYS as key}
						<button
							type="button"
							class="btn btn-gray text-2xl py-4"
							on:click={() => pressPin(key)}
							disabled={key === '00'}
							aria-label={key === 'erase' ? t('pos.terminal.erase') : key}
						>
							{key === 'erase' ? '⌫' : key === '00' ? '' : key}
						</button>
					{/each}
				</div>
				<button
					type="submit"
					class="btn body-mainCTA w-full text-xl py-4"
					disabled={pinDigits.length < 4}
				>
					{t('pos.terminal.signIn')}
				</button>
				<button type="button" class="underline" on:click={() => (operatorId = '')}>
					{t('pos.terminal.back')}
				</button>
			</form>
		{/if}
	{:else}
		<div class="flex items-center gap-3 text-sm opacity-70">
			<span>{data.deviceName} · {data.operator.alias}</span>
			<a href="/admin/arm-pos" class="underline">{t('pos.terminal.badges')}</a>
			{#if data.operator.actions.includes('xReport')}
				<a href="/pos/terminal/x" class="underline">{t('pos.terminal.xTitle')}</a>
			{/if}
			<form method="post" action="?/lock">
				<button type="submit" class="underline">{t('pos.terminal.switchOperator')}</button>
			</form>
		</div>

		{#if form?.error}
			<p class="text-red-500 text-center" role="alert">
				{t(`pos.terminal.errors.${form.error}`)}
			</p>
		{/if}

		{#if step === 'amount' || step === 'tip'}
			<label class="flex flex-col items-center gap-2 w-full max-w-sm">
				<span class="text-lg"
					>{step === 'tip' ? t('pos.terminal.tip') : t('pos.terminal.amount')}</span
				>
				<output class="text-5xl font-semibold tabular-nums" aria-live="polite">
					{format(step === 'tip' ? tip : amount)}
					{data.currency}
				</output>
				{#if step === 'tip'}
					<span class="text-sm opacity-70"
						>{t('pos.terminal.amountRecall', {
							amount: `${format(amount)} ${data.currency}`
						})}</span
					>
				{/if}
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
			{#if step === 'amount'}
				<button
					type="button"
					class="btn body-mainCTA w-full max-w-sm text-xl py-4"
					disabled={amount <= 0 || !data.methods.length}
					on:click={() => {
						tipDigits = '';
						tipSkipped = true;
						step = 'ref';
					}}
				>
					{t('pos.terminal.continue')}
				</button>
				<button
					type="button"
					class="btn btn-gray w-full max-w-sm text-xl py-4"
					disabled={amount <= 0 || !data.methods.length}
					on:click={() => {
						tipSkipped = false;
						step = 'tip';
					}}
				>
					{t('pos.terminal.enterTip')}
				</button>
				{#if !data.operator.actions.includes('charge')}
					<p class="text-center" role="alert">{t('pos.terminal.errors.notAllowed')}</p>
				{:else if !data.methods.length}
					<p class="text-center" role="alert">{t('pos.terminal.noProcessor')}</p>
				{/if}
			{:else}
				<button
					type="button"
					class="btn body-mainCTA w-full max-w-sm text-xl py-4"
					on:click={() => (step = 'ref')}
				>
					{tip === 0 ? t('pos.terminal.noTip') : t('pos.terminal.next')}
				</button>
			{/if}
		{:else if step === 'ref'}
			<label class="form-label w-full max-w-sm text-lg">
				{t('pos.terminal.ref')}
				<input
					class="form-input text-2xl"
					type="text"
					maxlength="100"
					autocomplete="off"
					bind:value={externalRef}
				/>
			</label>
			<button
				type="button"
				class="btn body-mainCTA w-full max-w-sm text-xl py-4"
				disabled={!externalRef.trim()}
				on:click={() => (step = 'method')}
			>
				{t('pos.terminal.next')}
			</button>
			{#if data.operator.actions.includes('tillDown')}
				<button
					type="button"
					class="btn btn-gray w-full max-w-sm text-xl py-4"
					on:click={() => {
						externalRef = '';
						step = 'method';
					}}
				>
					{t('pos.terminal.tillDown')}
				</button>
			{/if}
		{:else}
			<p class="text-lg">
				{t('pos.terminal.totalLine', { amount: `${format(amount + tip)} ${data.currency}` })}
			</p>
			{#if data.methods.length}
				<form method="post" action="?/pay" class="flex flex-col gap-3 w-full max-w-sm">
					<input type="hidden" name="amount" value={amount} />
					<input type="hidden" name="tip" value={tip} />
					{#if externalRef.trim()}
						<input type="hidden" name="externalRef" value={externalRef.trim()} />
					{/if}
					{#each data.methods as method}
						<button
							type="submit"
							name="method"
							value={method}
							class="btn body-mainCTA text-xl py-4"
						>
							{t(`checkout.paymentMethod.${method}`)}
						</button>
					{/each}
				</form>
			{:else}
				<p class="text-center">{t('pos.terminal.noMethod')}</p>
			{/if}
		{/if}

		{#if step !== 'amount'}
			<button type="button" class="underline" on:click={back}>{t('pos.terminal.back')}</button>
		{/if}
	{/if}
</main>
