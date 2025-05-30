<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import PriceTag from '$lib/components/PriceTag.svelte';
	import SetLightningQrCodeDescription from '$lib/components/SetLightningQrCodeDescription.svelte';
	import { onMount } from 'svelte';

	export let data;
	export let form;

	let rpcCommand = '';
	let rpcParams = '';
	let rpcMethod = 'GET';

	onMount(() => {
		rpcCommand = localStorage.getItem('lndRpcCommand') ?? '';
		rpcParams = localStorage.getItem('lndRpcParams') ?? '';
		rpcMethod = localStorage.getItem('lndRpcMethod') ?? 'GET';
	});
</script>

<h1 class="text-3xl">Lightning node</h1>

<h2 class="text-2xl">Status</h2>

<ul>
	<li>testnet: {data.info.testnet}</li>
	<li>alias: {data.info.alias}</li>
	<li>autopilot active: {data.autopilotActive}</li>
	<li>pending channels: {data.info.num_pending_channels}</li>
	<li>active channels: {data.info.num_active_channels}</li>
	<li>inactive channels: {data.info.num_inactive_channels}</li>
	<li>synced to chain: {data.info.synced_to_chain}</li>
	<li>synced to graph: {data.info.synced_to_graph}</li>
	<li>peers: {data.info.num_peers}</li>
	<li class="break-words">node url: {data.info.uris.join(' / ')}</li>
	{#if data.info.uris.length}
		<li>
			<b>LN url:</b>
			<a href="lightning:ln@{$page.url.hostname}" class="body-hyperlink">ln@{$page.url.hostname}</a>
			- any other @{$page.url.hostname} address will also work
		</li>
	{/if}
</ul>

{#if !data.autopilotActive}
	<form action="?/activateAutopilot" method="POST">
		<button type="submit" class="btn btn-black">Activate autopilot</button>
	</form>
{/if}

<h2 class="text-2xl">Balance</h2>

<ul>
	<li class="flex items-center gap-2">
		<PriceTag amount={data.walletBalance} currency="SAT" convertedTo="SAT" inline />
		{#if data.currencies.priceReference !== 'SAT'}(<PriceTag
				currency="SAT"
				amount={data.walletBalance}
				convertedTo={data.currencies.priceReference}
			/>){/if} in the wallet
	</li>
	<li class="flex items-center gap-2">
		<PriceTag amount={data.channelsBalance} currency="SAT" convertedTo="SAT" inline />
		{#if data.currencies.priceReference !== 'SAT'}(<PriceTag
				currency="SAT"
				amount={data.channelsBalance}
				convertedTo={data.currencies.priceReference}
			/>){/if} in channels
	</li>
</ul>

<h2 class="text-2xl">Invoices</h2>

<SetLightningQrCodeDescription
	bind:invoiceDescription={data.lightningInvoiceDescription}
	bind:brandName={data.brandName}
	showThirdPartyWarning={false}
/>

<h2 class="text-2xl">Channels</h2>

<ul>
	{#each data.channels as channel}
		<li>
			Channel {channel.chan_id}: {channel.capacity.toLocaleString('en')} capacity / {channel.local_balance.toLocaleString(
				'en'
			)} local balance /
			{channel.remote_balance.toLocaleString('en')} remote balance
		</li>
	{:else}
		No channels open
	{/each}
</ul>

{#if data.rpc}
	<h2 class="text-2xl">LND RPC</h2>

	<form
		action="?/rpc"
		class="contents"
		method="post"
		use:enhance={() => {
			localStorage.setItem('lndRpcCommand', rpcCommand);
			localStorage.setItem('lndRpcParams', rpcParams);
			localStorage.setItem('lndRpcMethod', rpcMethod);

			return async ({ update }) => {
				await update({ reset: false });
			};
		}}
	>
		<label class="form-label">
			Url
			<input
				type="text"
				name="url"
				class="form-input"
				bind:value={rpcCommand}
				required
				placeholder="/v1/getinfo"
			/>
		</label>
		<label class="form-label">
			Method
			<select class="form-input" name="method" bind:value={rpcMethod}>
				<option value="GET">GET</option>
				<option value="POST">POST</option>
			</select>
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
