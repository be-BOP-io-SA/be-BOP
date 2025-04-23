<script lang="ts">
	import PriceTag from '$lib/components/PriceTag.svelte';
	import { currencies } from '$lib/stores/currencies';
	import { debounce } from 'lodash-es';
	import { BityApiClient, type BityApiClientInterface } from '@bity/api';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { bityEstimate, type BityEstimate } from '$lib/types/bity.js';
	import { browser } from '$app/environment';
	import { sumCurrency } from '$lib/utils/sumCurrency.js';
	import { useI18n } from '$lib/i18n.js';
	import { exchangeRate } from '$lib/stores/exchangeRate';
	import { pick } from '$lib/utils/pick.js';

	export let data;

	let cashoutAmount = 0;
	let currency =
		$currencies.priceReference === 'SAT' || $currencies.priceReference === 'BTC'
			? 'EUR'
			: $currencies.priceReference;

	let estimate: BityEstimate | null = null;
	let estimating = false;
	let estimationError = '';

	$: remaining = data.balance - cashoutAmount;

	let bity: BityApiClientInterface;

	onMount(() => {
		// @ts-expect-error Bity needs to get their types right
		bity = new BityApiClient({
			exchangeApiUrl: 'https://exchange.api.bity.com/v2/',
			oauthConfig: {
				authorizationUrl: 'https://connect.bity.com/oauth2/auth',
				tokenUrl: 'https://connect.bity.com/oauth2/token',
				clientId: 'your-client-id',
				scopes: [
					'https://auth.bity.com/scopes/exchange.place',
					'https://auth.bity.com/scopes/exchange.history'
				],
				redirectUrl: $page.url.origin + '/api/auth/callback/bity',
				onAccessTokenExpiry: (refreshAccessToken) => {
					// As a developer you don't really need to handle anything here. But don't
					// forget this section. If refreshAccessToken() is not called, tokens will
					// not auto-renew.
					console.log(
						'Access token expired! Trying to get new token from re-using auth grant code.'
					);
					return refreshAccessToken();
				},
				onInvalidGrant: (/* refreshAuthCodeOrRefreshToken */) => {
					console.log('Auth grant or refresh token expired! Get a new authorization grant code.');
					// Normally call refreshAuthCodeOrRefreshToken(); which calls fetchAuthorizationCode().
					// But you can do whatever you want - maybe you want a user to press
					// a button that executes fetchAuthorizationCode() instead.
				}
			}
		});
	});

	function authorize() {
		// Redirects user to Bity OAuth 2.0 service
		bity.fetchAuthorizationCode();
	}

	// function createOrder function() {
	//   // Will automatically pass and renew tokens.
	//   bity.createOrder(...);
	// }

	async function estimateFees() {
		try {
			estimating = true;
			estimate = null;
			estimationError = '';
			let requestedAmount = cashoutAmount;
			estimate = await bityEstimate({
				amount: requestedAmount,
				from: 'BTC',
				to: 'EUR',
				paymentMethod: 'crypto_address'
			});
			if (requestedAmount !== cashoutAmount) {
				return;
			}
			if (+estimate.input.amount !== cashoutAmount) {
				estimationError =
					'Amount requested is invalid, estimation is done with: ' + estimate.input.amount + ' BTC';
			}
		} catch (err) {
			estimationError = (err as Error).message;
		} finally {
			estimating = false;
		}
	}

	const debouncedEstimate = debounce(estimateFees, 500);

	$: if (browser) {
		debouncedEstimate(), [cashoutAmount];
	}

	const { locale } = useI18n();

	$: estimatedFees = estimate
		? sumCurrency('BTC', [
				{
					amount: +estimate.price_breakdown.customer_trading_fee.amount,
					currency: estimate.price_breakdown.customer_trading_fee.currency
				},
				{
					amount: +estimate.price_breakdown['non-verified_fee'].amount,
					currency: estimate.price_breakdown['non-verified_fee'].currency
				},
				{
					amount: +estimate.price_breakdown.output_transaction_cost.amount,
					currency: estimate.price_breakdown.output_transaction_cost.currency
				}
		  ])
		: 0;
</script>

<h1 class="text-3xl">Bitcoin node - Bity cash out</h1>

<h2 class="text-2xl">Balance</h2>

<PriceTag amount={data.balance} currency="BTC" force />
<PriceTag amount={data.balance} convertedTo="SAT" force currency="BTC" />

<PriceTag amount={data.balance} convertedTo={currency} currency="BTC" />

<h2 class="text-2xl">Current exchange rate</h2>

<pre>{JSON.stringify(pick($exchangeRate, ['CHF', 'EUR', 'USD']), null, '\t').replaceAll(
		/[\t{}]/g,
		''
	)}</pre>

<h2 class="text-2xl">Cash-out amount (BTC)</h2>

<input type="number" class="form-input" bind:value={cashoutAmount} />

<h2 class="text-2xl">Billing currency estimation</h2>

{#if estimationError}
	<p class="text-red-500">{estimationError}</p>
{/if}

<p>
	Selected amount: <PriceTag
		amount={cashoutAmount}
		currency="BTC"
		class="font-bold"
		convertedTo={currency}
		inline
	/>
</p>

<p>
	Conversion fees will be applied, and bitcoin volatility may cause the final amount to be
	different. This is an estimation.
</p>

{#if estimating}
	<p>Estimating...</p>
{:else if estimate}
	<p>
		Estimated fees: <PriceTag
			amount={estimatedFees}
			currency="BTC"
			convertedTo={$currencies.priceReference}
			class="font-bold"
			inline
		/> ({((estimatedFees / +estimate.input.amount) * 100).toLocaleString($locale, {
			maximumFractionDigits: 2
		})}%)
	</p>

	<p>
		Total amount, fees deducted: <PriceTag
			amount={+estimate.output.amount}
			currency={estimate.output.currency}
			convertedTo={$currencies.priceReference}
			class="font-bold"
			inline
		/>
	</p>
{/if}

<h2 class="text-2xl">Remaining balance after withdrawal</h2>

<PriceTag amount={remaining} currency="BTC" force />
<PriceTag amount={remaining} convertedTo="SAT" force currency="BTC" />

<PriceTag amount={remaining} convertedTo={currency} currency="BTC" />

<div class="flex justify-between">
	<button class="btn btn-orange" on:click={authorize}>Request cashout</button>
	<a href="{data.adminPrefix}/bity" class="btn btn-gray">Cancel</a>
</div>
