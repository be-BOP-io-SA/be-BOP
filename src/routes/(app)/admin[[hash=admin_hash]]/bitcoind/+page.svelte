<script lang="ts">
	import { enhance } from '$app/forms';
	import PriceTag from '$lib/components/PriceTag.svelte';
	import { downloadFile } from '$lib/utils/downloadFile.js';
	import { formatDistance } from 'date-fns';
	import { onMount, tick } from 'svelte';

	export let data;
	export let form;

	let orderById = Object.fromEntries([...data.orders].map((order) => [order._id, order]));

	let walletToCreate = 'bootik';

	async function inputWalletName(event: Event) {
		const walletName = prompt('Wallet name')?.trim();

		if (!walletName) {
			return;
		}

		walletToCreate = walletName;

		await tick();

		(event.currentTarget as HTMLFormElement).submit();
	}

	async function dump(wallet: string) {
		const response = await fetch(`${data.adminPrefix}/bitcoind/dump`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ wallet })
		});

		if (response.ok) {
			downloadFile(await response.blob(), `wallet-${wallet}.json`);
		} else {
			alert('Error dumping wallet: ' + (await response.text()));
		}
	}

	let rpcCommand = '';
	let rpcParams = '';

	onMount(() => {
		rpcCommand = localStorage.getItem('rpcCommand') ?? '';
		rpcParams = localStorage.getItem('rpcParams') ?? '';
	});
</script>

<h1 class="text-3xl">Bitcoin node</h1>

<h2 class="text-2xl">Chain</h2>

<ul>
	<li>Blocks: {data.blockchainInfo.blocks.toLocaleString('en')}</li>
	<li>Chain: {data.blockchainInfo.chain}</li>
</ul>

{#if data.rpc}
	<h2 class="text-2xl">Bitcoin RPC</h2>

	<form
		action="?/rpc"
		class="contents"
		method="post"
		use:enhance={() => {
			localStorage.setItem('rpcCommand', rpcCommand);
			localStorage.setItem('rpcParams', rpcParams);

			return async ({ update }) => {
				await update({ reset: false });
			};
		}}
	>
		<label class="form-label">
			Command
			<input type="text" name="method" class="form-input" bind:value={rpcCommand} required />
		</label>
		<label class="form-label">
			Params
			<textarea cols="30" rows="10" name="params" class="form-input" bind:value={rpcParams} />
		</label>
		<button class="btn btn-black self-start" type="submit">Send</button>
	</form>

	{#if form?.rpcFail}
		<p class="text-red-500">{form.rpcFail}</p>
	{/if}

	{#if form?.rpcSuccess}
		<pre class="text-sm">{JSON.stringify(form.rpcSuccess, null, 2)}</pre>
	{/if}
{/if}

<h2 class="text-2xl">BIP 84</h2>

{#if !data.bip84}
	<p>
		BIP 84 is not enabled. Configure <kbd class="kbd body-secondaryCTA">BIP84_XPUB</kbd> in the environment
		to enable it, as well as the bitcoin node
	</p>
{:else}
	<ul>
		<li>BIP 84 Xpub: {data.bip84Xpub}</li>
		<li>
			Derivation path: <kbd class="kbd body-secondaryCTA">m/84'/0'/0'</kbd>
		</li>
		<li>
			Note that you need to create a new wallet (if not already done) via the UI, so that it will
			use the Xpub.
		</li>
	</ul>
{/if}

<h2 class="text-2xl">Wallet</h2>

{#if data.wallets.length}
	<ul>
		{#each data.wallets as wallet}
			<li class="flex gap-2">
				<span class:font-bold={wallet === data.currentWallet}>{wallet}</span>
				{#if data.currentWallet !== wallet}
					<form action="?/setCurrentWallet" method="post">
						<input type="hidden" value={wallet} name="wallet" />
						<button type="submit" class="body-hyperlink underline"> select </button>
					</form>
				{/if}
				<button on:click|preventDefault={() => dump(wallet)} class="body-hyperlink underline">
					dump
				</button>
			</li>
		{/each}
	</ul>

	<p>
		Changing wallet in an active be-BOP means that incoming transactions in the old wallet will not
		be detected.
	</p>
{/if}

<div class="flex gap-2">
	<form action="?/createWallet" method="post" on:submit|preventDefault={inputWalletName}>
		<input type="hidden" name="wallet" value={walletToCreate} />
		<button class="btn btn-black">Create wallet {data.bip84 ? 'for bip84 xpub' : ''}</button>
	</form>

	<form action="?/loadWallets" method="post">
		<button class="btn btn-black">Load all wallets on disk</button>
	</form>
</div>

<h2 class="text-2xl">Balance</h2>

<PriceTag amount={data.balance} currency="BTC" />

<h2 class="text-2xl">Transactions</h2>

<ul>
	{#each data.transactions as transaction}
		<li class="flex flex-wrap gap-2">
			Amount: {transaction.amount}
			{#if data.currencies.priceReference !== 'BTC'}(<PriceTag
					currency="BTC"
					amount={transaction.amount}
					convertedTo={data.currencies.priceReference}
				/>){/if} / Txid:
			<a
				class="underline body-hyperlink break-all"
				href="https://www.blockchain.com/en/explorer/transactions/{data.blockchainInfo.chain ===
				'test'
					? 'btc-testnet'
					: 'btc'}/{transaction.txid}">{transaction.txid}</a
			>
			{#if transaction.label?.startsWith('order:') && orderById[transaction.label.slice('order:'.length)]}
				{@const orderCreatedAt = orderById[transaction.label.slice('order:'.length)].createdAt}
				/
				<a class="underline body-hyperlink" href="/order/{transaction.label.slice('order:'.length)}"
					>Order</a
				>
				created
				<time datetime={orderCreatedAt.toJSON()} title={orderCreatedAt.toLocaleString('en')}
					>{formatDistance(orderCreatedAt, Date.now(), {
						addSuffix: true
					})}</time
				>
			{/if}
		</li>
	{:else}
		No transactions yet
	{/each}
</ul>
