<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import SetLightningQrCodeDescription from '$lib/components/SetLightningQrCodeDescription.svelte';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	export let data;
	export let form;

	let withdrawDialog: HTMLDialogElement | null;

	let recommendedFeeRate = 0;

	function showDialog() {
		withdrawDialog?.showModal();

		fetch('https://mempool.space/api/v1/fees/recommended')
			.then((res) => res.json())
			.then((data) => {
				recommendedFeeRate = data.hourFee;
			});
	}

	let withdrawMode = 'bolt11' as 'bolt11' | 'bitcoin';

	let defaultUrl = data.phoenixd.url || 'http://localhost:9740';
	let showBolt12 = false;
</script>

<h1 class="text-3xl">PhoenixD</h1>

{#if !data.phoenixd.enabled && !data.configManagedByEnvVars}
	<p>
		{t('admin.phoenixd.notActiveYetBefore')}
		<a href="https://phoenix.acinq.co/server/get-started" class="body-hyperlink underline"
			>{t('admin.phoenixd.thisProcedure')}</a
		>
		{t('admin.phoenixd.notActiveYetAfter')}
	</p>

	<p>
		{t('admin.phoenixd.onceDoneClickDetect', {
			buttonLabel: t('admin.phoenixd.detectServerButton')
		})}
	</p>

	<form method="POST" class="flex flex-col gap-2" action="?/detect">
		<label class="form-label">
			{t('admin.phoenixd.urlLabel')}
			<input
				type="url"
				name="url"
				class="form-input"
				placeholder="http://localhost:9740"
				value={defaultUrl}
				required
			/>
		</label>
		<p>{t('admin.phoenixd.dockerIntro')}</p>
		<ul class="list-disc ml-4 mb-4">
			<li>
				{t('admin.phoenixd.changeUrlTo')}
				<a
					href="http://host.docker.internal:9740"
					class="body-hyperlink underline"
					on:click|preventDefault={() => (defaultUrl = 'http://host.docker.internal:9740')}
					>http://host.docker.internal:9740</a
				>
			</li>
			<li>
				{t('admin.phoenixd.runPhoenixdWith')}
				<code class="font-mono">--http-bind-ip={data.dockerIp || '0.0.0.0'}</code>
			</li>
			<li>
				{t('admin.phoenixd.firewallPort', {
					source: data.dockerIp
						? t('admin.phoenixd.fromDockerIp', { dockerIp: data.dockerIp })
						: t('admin.phoenixd.fromDockerContainer')
				})}
				<code class="font-mono">ufw allow from any to {data.dockerIp || 'any'} port 9740</code>
			</li>
		</ul>

		<button class="btn btn-black self-start" type="submit"
			>{t('admin.phoenixd.detectServerButton')}</button
		>
	</form>

	{#if $page.status >= 400 && form?.message}
		<p class="text-red-500">{form.message}</p>
	{/if}
{:else}
	<p>{t('admin.phoenixd.maxExpirationNote')}</p>
	<form class="contents" method="POST" action="?/update">
		{#if !data.configManagedByEnvVars}
			<label class="form-label">
				{t('admin.phoenixd.httpPasswordLabel')}
				<input
					type="password"
					name="password"
					class="form-input"
					value={data.phoenixd.password}
					required
				/>
			</label>
		{:else}
			<div class="bg-gray-100 p-3 rounded">
				<p class="text-gray-500">
					{t('admin.phoenixd.managedByEnvVars')}
				</p>
			</div>
		{/if}

		<div class="flex gap-2">
			{#if !data.configManagedByEnvVars}
				<button class="btn btn-black" type="submit">{t('admin.action.save')}</button>
				<button class="btn btn-red" type="submit" form="disableForm"
					>{t('admin.action.reset')}</button
				>
			{/if}
			<button class="btn body-mainCTA" type="button" on:click={() => (showBolt12 = !showBolt12)}
				>{t('admin.phoenixd.getBolt12AddressButton')}</button
			>

			{#if data.nodeInfo}
				<button class="btn btn-blue ml-auto" type="button" on:click={() => showDialog()}
					>{t('admin.phoenixd.withdrawButton')}</button
				>
			{/if}
		</div>
		{#if showBolt12}
			<p class="break-words">
				{t('admin.phoenixd.bolt12AddressValue', { address: data.bolt12Address ?? '' })}
			</p>
			<p>{t('admin.phoenixd.pageCmsCode')} <code>[QRCode=Bolt12]</code></p>
		{/if}
	</form>
	<form method="POST" action="?/disable" id="disableForm"></form>
	<dialog bind:this={withdrawDialog} class="max-w-full w-[500px] rounded">
		<form
			method="POST"
			action="?/withdraw"
			use:enhance={() => {
				return async ({ result }) => {
					if (result.type === 'error') {
						alert(result.error?.message ?? JSON.stringify(result.error));
					} else if (result.type === 'success') {
						console.log(result.data);
						alert(
							t('admin.phoenixd.withdrawalSuccessful') +
								'\n\n' +
								JSON.stringify(result.data, null, 2)
						);
						withdrawDialog?.close();
					}
				};
			}}
			class="flex flex-col gap-2"
		>
			<label class="checkbox-label">
				<input
					type="radio"
					bind:group={withdrawMode}
					class="form-radio"
					name="withdrawMode"
					value="bolt11"
				/>
				{t('admin.phoenixd.lightningOption')}
			</label>

			<label class="checkbox-label">
				<input
					type="radio"
					bind:group={withdrawMode}
					class="form-radio"
					name="withdrawMode"
					value="bitcoin"
				/>
				{t('admin.phoenixd.bitcoinOption')}
			</label>

			{#if withdrawMode === 'bitcoin'}
				<label class="form-label">
					{t('admin.phoenixd.addressLabel')}
					<input type="text" name="address" class="form-input" placeholder="bc1p..." required />
				</label>

				<label class="form-label">
					{t('admin.phoenixd.amountSatsLabel')}
					<input type="number" name="amount" class="form-input" required />
				</label>

				<label class="form-label">
					{t('admin.phoenixd.feeRateLabel')}
					<input
						type="number"
						name="feeRate"
						class="form-input"
						placeholder={recommendedFeeRate ? '' + recommendedFeeRate : ''}
						required
					/>
					<p>
						{t('admin.phoenixd.checkoutMempoolBefore')}
						<a href="https://mempool.space" class="body-hyperlink" target="_blank">mempool.space</a>
						{t('admin.phoenixd.checkoutMempoolAfter')}
					</p>
				</label>
			{:else}
				<label class="form-label">
					{t('admin.phoenixd.bolt11InvoiceLabel')}
					<input type="text" name="address" class="form-input" placeholder="lnbc..." required />
				</label>

				<label class="form-label">
					{t('admin.phoenixd.amountSatsLabel')}
					<input
						type="number"
						name="amount"
						class="form-input"
						placeholder={t('admin.phoenixd.amountOptionalPlaceholder')}
					/>
				</label>
			{/if}

			<div class="flex gap-2">
				<button class="btn btn-black" type="submit">{t('admin.phoenixd.withdrawButton')}</button>

				<button
					class="btn body-mainCTA ml-auto"
					type="button"
					on:click={() => withdrawDialog?.close()}>{t('admin.phoenixd.cancelButton')}</button
				>
			</div>
		</form>
	</dialog>

	{#if data.nodeInfo === null}
		<p class="text-red-500">
			{t('admin.phoenixd.connectionErrorBefore')}
			<a href={defaultUrl} class="body-hyperlink underline">{defaultUrl}</a>{t(
				'admin.phoenixd.connectionErrorAfter',
				{ resetLabel: t('admin.action.reset') }
			)}
		</p>
	{:else if data.nodeInfo}
		<h2 class="text-2xl">{t('admin.phoenixd.nodeInfoTitle')}</h2>
		<pre>{JSON.stringify(data.nodeInfo, null, 2)}</pre>
	{/if}

	{#if data.balance}
		<h2 class="text-2xl">{t('admin.phoenixd.balanceTitle')}</h2>
		<pre>{JSON.stringify(data.balance, null, 2)}</pre>
	{/if}

	<h2 class="text-2xl">{t('admin.phoenixd.invoicesTitle')}</h2>

	<SetLightningQrCodeDescription
		bind:invoiceDescription={data.lightningInvoiceDescription}
		bind:brandName={data.brandName}
		showThirdPartyWarning={true}
	/>
{/if}
