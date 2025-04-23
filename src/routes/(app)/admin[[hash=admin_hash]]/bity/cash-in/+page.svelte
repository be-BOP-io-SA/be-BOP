<script lang="ts">
	import { browser } from '$app/environment';
	import { applyAction, enhance } from '$app/forms';
	import PriceTag from '$lib/components/PriceTag.svelte';
	import { currencies } from '$lib/stores/currencies.js';
	import { CURRENCIES } from '$lib/types/Currency';
	import { bityEstimate, type BityEstimate, type BityPaymentMethod } from '$lib/types/bity';
	import { debounce } from '$lib/utils/debounce';

	let estimating = false;
	let generating = false;
	let estimationError = '';
	let cashinAmount = 200;
	let cashinBtcAddress = '';
	let currency =
		$currencies.priceReference === 'SAT' || $currencies.priceReference === 'BTC'
			? 'EUR'
			: $currencies.priceReference;

	let paymentMethod: BityPaymentMethod = 'bank_account';

	let estimateVal: BityEstimate | null = null;

	async function estimate() {
		try {
			estimating = true;
			estimateVal = null;
			estimationError = '';
			let requestedAmount = cashinAmount;
			const estimate = await bityEstimate({
				amount: cashinAmount,
				from: currency,
				to: 'BTC',
				paymentMethod
			});

			if (cashinAmount !== requestedAmount) {
				return;
			}

			if (Number(estimate.input.amount) !== requestedAmount) {
				estimationError = `Bity doesn't support the requested amount. Estimation based on ${estimate.input.amount} ${estimate.input.currency} instead.`;
			}

			estimateVal = estimate;
		} catch (err) {
			estimationError = (err as Error).message;
		} finally {
			estimating = false;
		}
	}

	const debouncedEstimate = debounce(estimate, 500);

	$: if (browser) {
		debouncedEstimate(), [cashinAmount, currency, paymentMethod];
	}
</script>

<h1 class="text-3xl">Bitcoin node - Bity cash in</h1>

<p>
	In order to manage on-chain refunds and cross -be-BOP automatic invoices, you might need to keep a
	certain amount on your bitcoin wallet.
</p>

<p>
	In the case where you've already cashed out all or most of it, you can cash-in some fresh BTC/SATs
	on your wallet through BITY from flat payment or bank transfer.
</p>

<a
	href="https://help.bity.com/en/articles/1502287-how-do-i-buy-cryptocurrencies"
	target="_blank"
	class="underline">Functional documentation</a
>

<p>
	<span class="font-bold">Important:</span> To avoid cash-in fees, always keep a small amount of BTC
	on your wallet and avoid cashing out everything.
</p>

<h2 class="text-2xl">Cash-in amount</h2>

<p>Select the amount you want to cash-in:</p>

<div class="flex gap-2 max-w-7xl">
	<label class="form-label grow basis-0">
		Cash-in amount

		<input type="number" class="form-input" bind:value={cashinAmount} min="0" step="1" required />
	</label>

	<label class="form-label grow basis-0">
		Currency

		<select class="form-input" bind:value={currency}>
			{#each CURRENCIES.filter((c) => c !== 'BTC' && c !== 'SAT') as currency}
				<option value={currency}>{currency}</option>
			{/each}
		</select>
	</label>

	<label class="form-label grow basis-0">
		Payment method

		<select class="form-input" bind:value={paymentMethod}>
			<option value="bank_account">Bank transfer</option>
			<option value="online_instant_payment">Card payment</option>
		</select>
	</label>
</div>

{#if estimationError}
	<p class="text-red-500">{estimationError}</p>
{/if}
{#if estimating}
	<p>Estimating...</p>
{:else if estimateVal}
	<h3 class="text-xl">Fees</h3>

	<ul class="list-disc ml-4">
		<li class="flex gap-2 items-center">
			Bity fee: <PriceTag
				amount={+estimateVal.price_breakdown.customer_trading_fee.amount +
					+estimateVal.price_breakdown['non-verified_fee'].amount}
				currency={estimateVal.price_breakdown.customer_trading_fee.currency}
			/>
		</li>
		<li class="flex gap-2 items-center">
			Transaction cost of the BTC network: <PriceTag
				amount={+estimateVal.price_breakdown.output_transaction_cost.amount}
				currency={estimateVal.price_breakdown.output_transaction_cost.currency}
			/>
		</li>
	</ul>

	<h3 class="text-xl">Cash-in estimation</h3>

	<PriceTag
		amount={+estimateVal.output.amount}
		currency={estimateVal.output.currency}
		convertedTo="BTC"
		force
	/>
	<PriceTag
		amount={+estimateVal.output.amount}
		currency={estimateVal.output.currency}
		convertedTo="SAT"
		force
	/>
{/if}

{#if !cashinBtcAddress}
	<form
		class="contents"
		use:enhance={() => {
			generating = true;
			return async ({ result }) => {
				generating = false;
				if (result.type === 'success') {
					cashinBtcAddress = String(result.data?.btcAddress);
				} else {
					applyAction(result);
				}
			};
		}}
		method="post"
	>
		<button class="btn btn-blue self-start" disabled={generating}>
			Generate BTC address for cash-in
		</button>
	</form>
{:else}
	<h2 class="text-2xl">Cash-in instructions</h2>

	<p>
		Copy this BTC address and paste it in Bity's field:
		<code class="font-mono bg-gray-500 px-[2px] py-[1px] rounded text-white"
			>{cashinBtcAddress}</code
		>
	</p>

	<form
		method="get"
		action="https://bity.com/exchange/#/amount/{cashinAmount}/{currency}/-/BTC"
		class="contents"
		target="_blank"
	>
		<button class="btn btn-blue self-start"> Open Bity to cash in</button>
	</form>
{/if}
