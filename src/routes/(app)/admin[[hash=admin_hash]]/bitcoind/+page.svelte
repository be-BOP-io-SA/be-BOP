<script lang="ts">
	import { enhance } from '$app/forms';
	import PriceTag from '$lib/components/PriceTag.svelte';
	import { downloadFile } from '$lib/utils/downloadFile.js';
	import { formatDistance } from 'date-fns';
	import { onMount, tick } from 'svelte';
	import { useI18n } from '$lib/i18n.js';

	const { t } = useI18n();

	export let data;
	export let form;

	let orderById = Object.fromEntries([...data.orders].map((order) => [order._id, order]));

	let walletToCreate = 'bootik';

	async function inputWalletName(event: Event) {
		const walletName = prompt(t('admin.bitcoind.walletNamePrompt'))?.trim();

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
			alert(t('admin.bitcoind.errorDumpingWallet', { error: await response.text() }));
		}
	}

	let rpcCommand = '';
	let rpcParams = '';

	onMount(() => {
		rpcCommand = localStorage.getItem('rpcCommand') ?? '';
		rpcParams = localStorage.getItem('rpcParams') ?? '';
	});
</script>

<h1 class="text-3xl">{t('admin.bitcoind.bitcoinNode')}</h1>

<h2 class="text-2xl">{t('admin.bitcoind.chainHeading')}</h2>

<ul>
	<li>{t('admin.bitcoind.blocks', { blocks: data.blockchainInfo.blocks.toLocaleString('en') })}</li>
	<li>{t('admin.bitcoind.chainLabel', { chain: data.blockchainInfo.chain })}</li>
</ul>

{#if data.rpc}
	<h2 class="text-2xl">{t('admin.bitcoind.bitcoinRpc')}</h2>

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
			{t('admin.bitcoind.command')}
			<input type="text" name="method" class="form-input" bind:value={rpcCommand} required />
		</label>
		<label class="form-label">
			{t('admin.bitcoind.params')}
			<textarea cols="30" rows="10" name="params" class="form-input" bind:value={rpcParams} />
		</label>
		<button class="btn btn-black self-start" type="submit">{t('admin.bitcoind.send')}</button>
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
		{t('admin.bitcoind.bip84NotEnabledBefore')}
		<kbd class="kbd body-secondaryCTA">BIP84_XPUB</kbd>
		{t('admin.bitcoind.bip84NotEnabledAfter')}
	</p>
{:else}
	<ul>
		<li>{t('admin.bitcoind.bip84Xpub', { xpub: data.bip84Xpub })}</li>
		<li>
			{t('admin.bitcoind.derivationPath')}
			<kbd class="kbd body-secondaryCTA">m/84'/0'/0'</kbd>
		</li>
		<li>
			{t('admin.bitcoind.createNewWalletNote')}
		</li>
	</ul>
{/if}

<h2 class="text-2xl">{t('admin.bitcoind.walletHeading')}</h2>

{#if data.wallets.length}
	<ul>
		{#each data.wallets as wallet}
			<li class="flex gap-2">
				<span class:font-bold={wallet === data.currentWallet}>{wallet}</span>
				{#if data.currentWallet !== wallet}
					<form action="?/setCurrentWallet" method="post">
						<input type="hidden" value={wallet} name="wallet" />
						<button type="submit" class="body-hyperlink underline">
							{t('admin.bitcoind.select')}
						</button>
					</form>
				{/if}
				<button on:click|preventDefault={() => dump(wallet)} class="body-hyperlink underline">
					{t('admin.bitcoind.dump')}
				</button>
			</li>
		{/each}
	</ul>

	<p>
		{t('admin.bitcoind.changingWalletWarning')}
	</p>
{/if}

<div class="flex gap-2">
	<form action="?/createWallet" method="post" on:submit|preventDefault={inputWalletName}>
		<input type="hidden" name="wallet" value={walletToCreate} />
		<button class="btn btn-black"
			>{data.bip84
				? t('admin.bitcoind.createWalletBip84')
				: t('admin.bitcoind.createWallet')}</button
		>
	</form>

	<form action="?/loadWallets" method="post">
		<button class="btn btn-black">{t('admin.bitcoind.loadAllWallets')}</button>
	</form>
</div>

<h2 class="text-2xl">{t('admin.bitcoind.balance')}</h2>

<PriceTag amount={data.balance} currency="BTC" />

<h2 class="text-2xl">{t('admin.bitcoind.transactions')}</h2>

<ul>
	{#each data.transactions as transaction}
		<li class="flex flex-wrap gap-2">
			{t('admin.bitcoind.amount', { amount: transaction.amount })}
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
					>{t('admin.bitcoind.order')}</a
				>
				{t('admin.bitcoind.created')}
				<time datetime={orderCreatedAt.toJSON()} title={orderCreatedAt.toLocaleString('en')}
					>{formatDistance(orderCreatedAt, Date.now(), {
						addSuffix: true
					})}</time
				>
			{/if}
		</li>
	{:else}
		{t('admin.bitcoind.noTransactions')}
	{/each}
</ul>
