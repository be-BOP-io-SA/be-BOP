<script lang="ts">
	import IconInfo from '$lib/components/icons/IconInfo.svelte';
	import { bech32 } from 'bech32';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	export let data;
	export let form;

	let nsecInputEl: HTMLInputElement;
	let readOnlyForm = data.settingsEnforcedByEnvVars;
	let writeNsecDisabled = !!data.nostr.privateKey || readOnlyForm;
	let showNsec = false;

	let relays = data.nostrRelays;
	let displayPublicMessages = true;
	let displayPrivateMessages = true;

	async function generateNostrKey() {
		const hex = crypto.getRandomValues(new Uint8Array(32));
		const nsec = bech32.encode('nsec', bech32.toWords(hex));
		nsecInputEl.value = nsec;
	}
</script>

<h1 class="text-3xl">NostR</h1>

{#if form?.success}
	<p class="alert-success">
		{form.success}
	</p>
{/if}

{#if form?.error}
	<p class="alert-error">
		{form.error}
	</p>
{/if}

{#if form?.events}
	{#each form.events as event}
		<pre class="font-mono">{JSON.stringify(event, null, 2)}</pre>
	{/each}
{/if}

<h2 class="text-2xl">{t('admin.nostr.privateKeyConfiguration')}</h2>

{#if data.settingsEnforcedByEnvVars}
	<div class="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
		<div class="flex items-start">
			<div class="flex-shrink-0">
				<svg class="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
						clip-rule="evenodd"
					/>
				</svg>
			</div>
			<div class="ml-3">
				<h3 class="text-sm font-medium text-yellow-800">
					{t('admin.nostr.privateKeyConfiguredViaEnvVars')}
				</h3>
				<div class="mt-2 text-sm text-yellow-700">
					<p>
						{t('admin.nostr.privateKeyEnvVarsDescription')}
					</p>
					<ul class="mt-2 list-disc list-inside">
						<li>NOSTR_PRIVATE_KEY</li>
					</ul>
				</div>
			</div>
		</div>
	</div>
{:else}
	<p class="text-gray-600 mb-6">{t('admin.nostr.configurePrivateKeyDescription')}</p>
{/if}

<form action="?/updatePrivateKey" method="post" class="flex flex-col gap-4 mb-6">
	<label class="form-label">
		{t('admin.nostr.privateKeyNsecFormat')}
		<div class="flex gap-2 items-center">
			<input
				bind:this={nsecInputEl}
				type={showNsec ? 'text' : 'password'}
				class="form-input flex-1"
				name="privateKey"
				value={data.nostr.privateKey ?? ''}
				on:input={(e) => (data.nostr.privateKey = e.currentTarget.value)}
				disabled={writeNsecDisabled}
				required
				placeholder="nsec1..."
			/>
			<button
				type="button"
				class="btn btn-gray"
				on:click={() => (showNsec = !showNsec)}
				title={showNsec ? 'Hide private key' : 'Show private key'}
				aria-label={showNsec ? 'Hide private key' : 'Show private key'}
			>
				{showNsec ? '🙈' : '👁️'}
			</button>
		</div>
	</label>
	<div class="flex justify-between items-center mt-6">
		<div class="flex gap-3">
			<button
				class="btn btn-black"
				type="submit"
				disabled={writeNsecDisabled}
				title={writeNsecDisabled ? t('admin.nostr.deleteKeyFirstToSave') : ''}
			>
				{t('admin.nostr.savePrivateKey')}
			</button>
			<button
				class="btn btn-gray"
				type="submit"
				disabled={writeNsecDisabled}
				on:click={generateNostrKey}
				title={writeNsecDisabled ? t('admin.nostr.deleteKeyFirstToGenerate') : ''}
			>
				{t('admin.nostr.generateNewKey')}
			</button>
		</div>
		<button
			class="btn btn-red"
			type="submit"
			disabled={!writeNsecDisabled || readOnlyForm}
			formaction="?/delete"
			on:click={(e) => {
				if (!confirm(t('admin.nostr.confirmDeletePrivateKey'))) {
					e.preventDefault();
				}
			}}
		>
			{t('admin.nostr.deletePrivateKey')}
		</button>
	</div>
</form>

{#if data.nostrPublicKey}
	<p class="break-words">
		{t('admin.nostr.yourPublicKeyIs', { publicKey: data.nostrPublicKey })}
	</p>
{/if}

{#if data.nostrPrivateKey}
	{#if data.origin}
		<form action="?/certify" class="flex flex-col gap-4" method="post">
			<button class="btn btn-black self-start" type="submit">{t('admin.nostr.certify')}</button>
		</form>
	{/if}

	<h2 class="text-2xl">{t('admin.nostr.sendMessage')}</h2>

	<form action="?/sendMessage" method="post" class="flex flex-col gap-4">
		<label class="form-label">
			NPUB
			<input
				class="form-input"
				type="text"
				name="npub"
				placeholder="npubXXXXXXXXXXXXXXXXXXXXXXXXXX"
				required
			/>
		</label>

		<label>
			{t('admin.nostr.message')}
			<input class="form-input" type="text" name="message" required />
		</label>

		<button class="btn btn-black self-start" type="submit">{t('admin.nostr.send')}</button>
	</form>
{/if}

<h2 class="text-2xl">{t('admin.nostr.getMetadata')}</h2>

<form action="?/getMetadata" method="post" class="flex flex-col gap-4">
	<label class="form-label">
		NPUB
		<input
			class="form-input"
			type="text"
			name="npub"
			placeholder="npubXXXXXXXXXXXXXXXXXXXXXXXXXX"
			required
		/>
	</label>

	<button class="btn btn-black self-start" type="submit">{t('admin.nostr.getMetadata')}</button>
</form>

<h2 class="text-2xl">{t('admin.nostr.relays')}</h2>
<form action="?/updateRelays" method="post" class="flex flex-col gap-4">
	<ul>
		{#each relays as relay}
			<li>
				{relay}<button type="button" on:click={() => (relays = relays.filter((r) => r !== relay))}
					>🗑️</button
				>
			</li>
			<input type="hidden" name="relays" value={relay} />
		{/each}
	</ul>
	<label class="form-label">
		{t('admin.nostr.relay')}
		<input
			class="form-input"
			type="text"
			name="relays"
			placeholder="wss://new.relay.url"
			pattern="wss://.*"
		/>
	</label>
	<button class="btn btn-black self-start" type="submit">{t('admin.nostr.updateRelayList')}</button>
</form>
<div class="flex items-center gap-2 text-2xl">
	{t('admin.nostr.introMessage')}
	<div class="contents" title={t('admin.nostr.introMessageTooltip')}>
		<IconInfo class="cursor-pointer"></IconInfo>
	</div>
</div>
<form action="?/disableIntro" method="post" class="flex flex-col gap-4">
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="disableNostrBotIntro"
			class="form-checkbox"
			checked={data.disableNostrBotIntro}
		/>
		{t('admin.nostr.disableNostrBotIntroMessage')}
	</label>
	<button class="btn btn-black self-start" type="submit">{t('admin.nostr.send')}</button>
</form>
{#if 0}
	<h2 class="text-2xl">Zaps</h2>

	<ul>
		{#each data.receivedMessages.filter((mes) => mes.kind === 9735) as message}
			<li class="break-words">
				{#if message.kind === 4}
					<span title={t('admin.nostr.encryptedMessage')}>'⚡'</span>
				{/if}
				<time datetime={message.createdAt.toJSON()}
					>{message.createdAt.toLocaleString('en-UK')}</time
				>
				| {JSON.stringify(message)}
			</li>
		{/each}
	</ul>
{/if}
<h2 class="text-2xl">{t('admin.nostr.receivedMessages')}</h2>

<label class="checkbox-label">
	<input type="checkbox" bind:checked={displayPublicMessages} class="form-checkbox" />
	{t('admin.nostr.displayPublicMessages')}</label
>

<label class="checkbox-label">
	<input type="checkbox" bind:checked={displayPrivateMessages} class="form-checkbox" />
	{t('admin.nostr.displayPrivateMessages')}</label
>
<ul>
	{#each data.receivedMessages as message}
		<li class="break-words">
			{#if message.kind === 4 && displayPrivateMessages}
				<span title={t('admin.nostr.encryptedMessage')}>'🔐'</span>

				<time datetime={message.createdAt.toJSON()}
					>{message.createdAt.toLocaleString('en-UK')}</time
				>
				|
				{message.source} | {message.content}
			{/if}
			{#if message.kind !== 4 && displayPublicMessages}
				<time datetime={message.createdAt.toJSON()}
					>{message.createdAt.toLocaleString('en-UK')}</time
				>
				|
				{message.source} | {message.content}
			{/if}
		</li>
	{/each}
</ul>
