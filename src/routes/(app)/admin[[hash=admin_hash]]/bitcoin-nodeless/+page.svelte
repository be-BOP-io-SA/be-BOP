<script lang="ts">
	import { enhance, applyAction } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	export let data;
	export let form;

	let selectedFormat: 'bip84' | 'bip48' = data.bitcoinNodeless.format ?? 'bip84';
	let publicKey = data.bitcoinNodeless.publicKey ?? '';
	let m = data.bitcoinNodeless.m ?? 2;
	let n = data.bitcoinNodeless.xpubs?.length ?? 3;
	let xpubs: string[] = Array.from(
		{ length: Math.max(2, Math.min(15, n)) },
		(_, i) => data.bitcoinNodeless.xpubs?.[i] ?? ''
	);
	let mempoolUrl = data.bitcoinNodeless.mempoolUrl ?? 'https://mempool.space';
	let derivationIndex = data.bitcoinNodeless.derivationIndex ?? 0;
	let skipUsedAddresses = data.bitcoinNodeless.skipUsedAddresses ?? true;

	// Resize xpubs when user changes N (preserves existing values up to new length)
	$: {
		const clamped = Math.max(2, Math.min(15, n || 2));
		if (xpubs.length !== clamped) {
			xpubs = Array.from({ length: clamped }, (_, i) => xpubs[i] ?? '');
		}
	}

	$: alreadySet =
		selectedFormat === 'bip48'
			? (data.bitcoinNodeless.xpubs?.length ?? 0) > 0
			: !!data.bitcoinNodeless.publicKey;
</script>

<h1 class="text-3xl">{t('admin.bitcoinNodeless.title')}</h1>

<p>
	{t('admin.bitcoinNodeless.intro')}
</p>

<h2 class="text-2xl">{t('admin.bitcoinNodeless.configuration')}</h2>

{#key data.bitcoinNodeless}
	<form
		method="post"
		class="flex flex-col gap-4"
		use:enhance={() => {
			return async ({ result }) => {
				await applyAction(result);
				if (result.type === 'success') {
					await invalidateAll();
				}
			};
		}}
	>
		<label class="form-label">
			{t('admin.bitcoinNodeless.derivationScheme')}
			<select name="format" class="form-input" disabled={alreadySet} bind:value={selectedFormat}>
				<option value="bip84">{t('admin.bitcoinNodeless.singleSignatureOption')}</option>
				<option value="bip48">{t('admin.bitcoinNodeless.multiSignatureOption')}</option>
			</select>
			<p class="text-sm">
				{#if selectedFormat === 'bip84'}
					{t('admin.bitcoinNodeless.bip84Description')}
				{:else}
					{t('admin.bitcoinNodeless.bip48Description')}
				{/if}
			</p>
		</label>

		{#if selectedFormat === 'bip84'}
			<label class="form-label">
				{t('admin.bitcoinNodeless.publicKey')}
				<input
					type="text"
					name="publicKey"
					class="form-input"
					required
					placeholder="zpub... / xpub... / tpub... / vpub..."
					readonly={alreadySet}
					bind:value={publicKey}
				/>
				{#if form?.errors?.publicKey}
					<p class="text-red-500 text-sm mt-1">{form.errors.publicKey}</p>
				{/if}
				<p class="text-sm">
					{t('admin.bitcoinNodeless.publicKeyDescriptionBefore')}
					<a href="https://sparrowwallet.com/" rel="noreferrer">Sparrow Wallet</a>
					{t('admin.bitcoinNodeless.publicKeyDescriptionAfter')}
				</p>
			</label>
		{:else}
			<label class="form-label">
				{t('admin.bitcoinNodeless.requiredSignatures')}
				<input
					type="number"
					name="m"
					class="form-input"
					min="1"
					max={n || 15}
					bind:value={m}
					required
					disabled={alreadySet}
				/>
				{#if form?.errors?.m}
					<p class="text-red-500 text-sm mt-1">{form.errors.m}</p>
				{/if}
				<p class="text-sm">{t('admin.bitcoinNodeless.requiredSignaturesDescription')}</p>
			</label>

			<label class="form-label">
				{t('admin.bitcoinNodeless.totalSignatures')}
				<input
					type="number"
					name="n"
					class="form-input"
					min="2"
					max="15"
					bind:value={n}
					required
					disabled={alreadySet}
				/>
				{#if form?.errors?.n}
					<p class="text-red-500 text-sm mt-1">{form.errors.n}</p>
				{/if}
				<p class="text-sm">{t('admin.bitcoinNodeless.totalSignaturesDescription')}</p>
			</label>

			{#each xpubs as xpub, i (i)}
				<label class="form-label">
					{t('admin.bitcoinNodeless.cosignerXpub', { index: i + 1 })}
					<input
						type="text"
						name="xpubs[{i}]"
						class="form-input"
						value={xpub}
						on:input={(e) => (xpubs[i] = e.currentTarget.value)}
						required
						disabled={alreadySet}
						placeholder="Zpub... / Vpub... / xpub... / tpub..."
					/>
					{#if form?.errors?.[`xpubs[${i}]`]}
						<p class="text-red-500 text-sm mt-1">{form.errors[`xpubs[${i}]`]}</p>
					{/if}
				</label>
			{/each}

			{#if form?.errors?.xpubs}
				<p class="text-red-500 text-sm">{form.errors.xpubs}</p>
			{/if}

			{#if n >= 2 && m >= 1 && m <= n}
				<p class="text-sm font-medium">
					{t('admin.bitcoinNodeless.walletPolicy', { m, n })}
				</p>
			{/if}

			<p class="text-sm">
				{t('admin.bitcoinNodeless.multiSigDescription')}
			</p>
		{/if}

		<label class="form-label">
			{t('admin.bitcoinNodeless.derivationIndex')}

			<input
				type="number"
				name="derivationIndex"
				class="form-input"
				required
				disabled={alreadySet}
				bind:value={derivationIndex}
			/>

			{#if form?.errors?.derivationIndex}
				<p class="text-red-500 text-sm mt-1">{form.errors.derivationIndex}</p>
			{/if}

			<p class="text-sm">
				{t('admin.bitcoinNodeless.derivationIndexDescription')}
			</p>
		</label>

		<label class="form-label">
			{t('admin.bitcoinNodeless.mempoolUrl')}
			<input type="url" name="mempoolUrl" class="form-input" bind:value={mempoolUrl} required />
			{#if form?.errors?.mempoolUrl}
				<p class="text-red-500 text-sm mt-1">{form.errors.mempoolUrl}</p>
			{/if}
			<p class="text-sm">
				{t('admin.bitcoinNodeless.mempoolUrlDescriptionBefore')}
				<a href="https://github.com/mempool/mempool" rel="noreferrer"
					>{t('admin.bitcoinNodeless.openSource')}</a
				>.
			</p>
		</label>

		<label class="checkbox-label">
			<input
				type="checkbox"
				name="skipUsedAddresses"
				class="form-checkbox"
				bind:checked={skipUsedAddresses}
			/>
			{t('admin.bitcoinNodeless.skipUsedAddresses')}
		</label>

		<div class="flex gap-2">
			{#if alreadySet}
				<button class="btn btn-black" type="submit" formaction="?/update"
					>{t('admin.action.update')}</button
				>
				<button
					class="btn btn-red ml-auto"
					type="submit"
					formaction="?/delete"
					on:click={(e) =>
						confirm(t('admin.bitcoinNodeless.deleteConfigurationConfirm'))
							? true
							: e.preventDefault()}>{t('admin.bitcoinNodeless.deleteConfiguration')}</button
				>
			{:else}
				<button class="btn btn-black" type="submit" formaction="?/initialize"
					>{t('admin.bitcoinNodeless.setUp')}</button
				>
			{/if}
		</div>
	</form>
{/key}

{#if data.nextAddresses.length}
	<h2 class="text-2xl">{t('admin.bitcoinNodeless.nextAddresses')}</h2>

	<p>{t('admin.bitcoinNodeless.nextAddressesDescription')}</p>

	{#if data.hasAlreadyUsedNextAddresses}
		<div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 text-sm text-yellow-700">
			! <strong>{t('admin.bitcoinNodeless.warning')}</strong>
			{t('admin.bitcoinNodeless.alreadyUsedAddressWarning')}
		</div>
	{/if}

	<ul class="font-mono">
		{#each data.nextAddresses as addressData}
			<li class="flex gap-2">
				- {addressData.address}
				{#if addressData.isUsed}
					<span class="text-xs bg-yellow-200 text-yellow-900 px-2 py-1 rounded">
						! {t('admin.bitcoinNodeless.alreadyUsed')}
					</span>
				{/if}
			</li>
		{/each}
	</ul>
{/if}
