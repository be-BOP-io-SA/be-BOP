<script lang="ts">
	import { enhance, applyAction } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

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

<h1 class="text-3xl">Bitcoin nodeless</h1>

<p>
	Enter your public key(s). be-BOP will be able to generate new addresses and check funds received,
	but you have full control of the funds on your own wallet.
</p>

<h2 class="text-2xl">Configuration</h2>

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
			Derivation scheme
			<select name="format" class="form-input" disabled={alreadySet} bind:value={selectedFormat}>
				<option value="bip84">Single Signature (BIP-84)</option>
				<option value="bip48">Multi-Signature (BIP-48 - P2WSH)</option>
			</select>
			<p class="text-sm">
				{#if selectedFormat === 'bip84'}
					BIP 84 derives single-signature native SegWit addresses (bc1...).
				{:else}
					BIP 48 derives multi-signature P2WSH addresses requiring M-of-N cosigner approval.
				{/if}
			</p>
		</label>

		{#if selectedFormat === 'bip84'}
			<label class="form-label">
				Public key
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
					A BIP84 extended public key. You can use a wallet such as <a
						href="https://sparrowwallet.com/"
						rel="noreferrer">Sparrow Wallet</a
					>
					to generate one. The derivation path should be m/84'/0'/0' for mainnet and m/84'/1'/0' for
					testnet.
				</p>
			</label>
		{:else}
			<label class="form-label">
				Required signatures (M)
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
				<p class="text-sm">The minimum number of cosigner approvals required to spend funds.</p>
			</label>

			<label class="form-label">
				Total signatures (N)
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
				<p class="text-sm">The total number of cosigners.</p>
			</label>

			{#each xpubs as xpub, i (i)}
				<label class="form-label">
					Cosigner {i + 1} xpub
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
					Wallet policy: {m}-of-{n}
				</p>
			{/if}

			<p class="text-sm">
				Provide the account-level public keys from each cosigner. The derivation path should be
				m/48'/0'/0'/2' for mainnet P2WSH. Pubkeys will be sorted per BIP-67 for deterministic
				address generation.
			</p>
		{/if}

		<label class="form-label">
			Derivation index

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
				The derivation index is the index of the address to generate. It starts at 0 and increments
				by 1 for each new address / bitcoin payment request on be-BOP. DO NOT CHANGE THIS VALUE
				unless you know what you are doing. It can lead to reusing existing addresses or creating
				addresses not detected by your wallet.
			</p>
		</label>

		<label class="form-label">
			Mempool URL
			<input type="url" name="mempoolUrl" class="form-input" bind:value={mempoolUrl} required />
			{#if form?.errors?.mempoolUrl}
				<p class="text-red-500 text-sm mt-1">{form.errors.mempoolUrl}</p>
			{/if}
			<p class="text-sm">
				The URL of the mempool API to use, to check incoming funds on the generated addresses. You
				can add a /testnet suffix. The official API is rate-limited, but you can host your own as
				the project is <a href="https://github.com/mempool/mempool" rel="noreferrer">open-source</a
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
			Skip on-chain address to use for invoicing if it's already used
		</label>

		<div class="flex gap-2">
			{#if alreadySet}
				<button class="btn btn-black" type="submit" formaction="?/update">Update</button>
				<button
					class="btn btn-red ml-auto"
					type="submit"
					formaction="?/delete"
					on:click={(e) =>
						confirm('Delete bitcoin nodeless configuration? This action cannot be undone.')
							? true
							: e.preventDefault()}>Delete configuration</button
				>
			{:else}
				<button class="btn btn-black" type="submit" formaction="?/initialize">Set up</button>
			{/if}
		</div>
	</form>
{/key}

{#if data.nextAddresses.length}
	<h2 class="text-2xl">Next addresses</h2>

	<p>Those will be the next addresses generated by be-BOP</p>

	{#if data.hasAlreadyUsedNextAddresses}
		<div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 text-sm text-yellow-700">
			! <strong>Warning:</strong> At least one address was already used. Use a specific wallet XPub for
			your be-BOP or define another derivation address to avoid double-use of your address.
		</div>
	{/if}

	<ul class="font-mono">
		{#each data.nextAddresses as addressData}
			<li class="flex gap-2">
				- {addressData.address}
				{#if addressData.isUsed}
					<span class="text-xs bg-yellow-200 text-yellow-900 px-2 py-1 rounded">
						! already used
					</span>
				{/if}
			</li>
		{/each}
	</ul>
{/if}
