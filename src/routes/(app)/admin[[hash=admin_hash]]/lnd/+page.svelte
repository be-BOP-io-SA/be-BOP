<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import PriceTag from '$lib/components/PriceTag.svelte';
	import SetLightningQrCodeDescription from '$lib/components/SetLightningQrCodeDescription.svelte';
	import { onMount } from 'svelte';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

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

<h1 class="text-3xl">{t('admin.lnd.title')}</h1>

<h2 class="text-2xl">{t('admin.lnd.status')}</h2>

<ul>
	<li>{t('admin.lnd.testnet', { value: String(data.info.testnet) })}</li>
	<li>{t('admin.lnd.alias', { value: data.info.alias })}</li>
	<li>{t('admin.lnd.autopilotActive', { value: String(data.autopilotActive) })}</li>
	<li>{t('admin.lnd.pendingChannels', { value: data.info.num_pending_channels })}</li>
	<li>{t('admin.lnd.activeChannels', { value: data.info.num_active_channels })}</li>
	<li>{t('admin.lnd.inactiveChannels', { value: data.info.num_inactive_channels })}</li>
	<li>{t('admin.lnd.syncedToChain', { value: String(data.info.synced_to_chain) })}</li>
	<li>{t('admin.lnd.syncedToGraph', { value: String(data.info.synced_to_graph) })}</li>
	<li>{t('admin.lnd.peers', { value: data.info.num_peers })}</li>
	<li class="break-words">{t('admin.lnd.nodeUrl', { value: data.info.uris.join(' / ') })}</li>
	{#if data.info.uris.length}
		<li>
			<b>{t('admin.lnd.lnUrl')}</b>
			<a href="lightning:ln@{$page.url.hostname}" class="body-hyperlink">ln@{$page.url.hostname}</a>
			{t('admin.lnd.anyOtherAddressWorks', { hostname: $page.url.hostname })}
		</li>
	{/if}
</ul>

{#if !data.autopilotActive}
	<form action="?/activateAutopilot" method="POST">
		<button type="submit" class="btn btn-black">{t('admin.lnd.activateAutopilot')}</button>
	</form>
{/if}

<h2 class="text-2xl">{t('admin.lnd.balance')}</h2>

<ul>
	<li class="flex items-center gap-2">
		<PriceTag amount={data.walletBalance} currency="SAT" convertedTo="SAT" inline />
		{#if data.currencies.priceReference !== 'SAT'}(<PriceTag
				currency="SAT"
				amount={data.walletBalance}
				convertedTo={data.currencies.priceReference}
			/>){/if}
		{t('admin.lnd.inTheWallet')}
	</li>
	<li class="flex items-center gap-2">
		<PriceTag amount={data.channelsBalance} currency="SAT" convertedTo="SAT" inline />
		{#if data.currencies.priceReference !== 'SAT'}(<PriceTag
				currency="SAT"
				amount={data.channelsBalance}
				convertedTo={data.currencies.priceReference}
			/>){/if}
		{t('admin.lnd.inChannels')}
	</li>
</ul>

<h2 class="text-2xl">{t('admin.lnd.invoices')}</h2>

<SetLightningQrCodeDescription
	bind:invoiceDescription={data.lightningInvoiceDescription}
	bind:brandName={data.brandName}
	showThirdPartyWarning={false}
/>

<h2 class="text-2xl">{t('admin.lnd.channels')}</h2>

<ul>
	{#each data.channels as channel}
		<li>
			{t('admin.lnd.channelSummary', {
				chanId: channel.chan_id,
				capacity: channel.capacity.toLocaleString('en'),
				localBalance: channel.local_balance.toLocaleString('en'),
				remoteBalance: channel.remote_balance.toLocaleString('en')
			})}
		</li>
	{:else}
		{t('admin.lnd.noChannelsOpen')}
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
			{t('admin.lnd.url')}
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
			{t('admin.lnd.method')}
			<select class="form-input" name="method" bind:value={rpcMethod}>
				<option value="GET">GET</option>
				<option value="POST">POST</option>
			</select>
		</label>
		<label class="form-label">
			{t('admin.lnd.params')}
			<textarea cols="30" rows="10" name="params" class="form-input" bind:value={rpcParams} />
		</label>
		<button class="btn btn-black self-start" type="submit">{t('admin.lnd.send')}</button>
	</form>

	{#if form?.rpcFail}
		<p class="text-red-500">{form.rpcFail}</p>
	{/if}

	{#if form?.rpcSuccess}
		<pre class="text-sm">{JSON.stringify(form.rpcSuccess, null, 2)}</pre>
	{/if}
{/if}
