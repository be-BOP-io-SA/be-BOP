<script lang="ts">
	import IconInfo from '$lib/components/icons/IconInfo.svelte';
	import { bech32 } from 'bech32';
	export let data;
	export let form;

	let nsecInputEl: HTMLInputElement;
	let readOnlyForm = data.settingsEnforcedByEnvVars;
	let writeNsecDisabled = !!data.nostr.privateKey || readOnlyForm;

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

<h2 class="text-2xl">Private Key Configuration</h2>

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
					Nostr private key Configured via Environment Variables
				</h3>
				<div class="mt-2 text-sm text-yellow-700">
					<p>
						The Nostr private key is currently controlled by your environment configuration, which
						takes precedence over the form below. To modify it, update or remove the following
						environment values (for example, in the be-BOP configuration file or your hosting
						provider’s settings), then restart be-BOP.
					</p>
					<ul class="mt-2 list-disc list-inside">
						<li>NOSTR_PRIVATE_KEY</li>
					</ul>
				</div>
			</div>
		</div>
	</div>
{:else}
	<p class="text-gray-600 mb-6">Configure your Nostr private key.</p>
{/if}

<form action="?/updatePrivateKey" method="post" class="flex flex-col gap-4 mb-6">
	<label class="form-label">
		Private Key (nsec format)
		<input
			bind:this={nsecInputEl}
			type="password"
			class="form-input"
			name="privateKey"
			bind:value={data.nostr.privateKey}
			disabled={writeNsecDisabled}
			required
			placeholder="nsec1..."
		/>
	</label>
	<div class="flex justify-between items-center mt-6">
		<div class="flex gap-3">
			<button
				class="btn btn-black"
				type="submit"
				disabled={writeNsecDisabled}
				title={writeNsecDisabled ? 'Delete the private key first to save a new one' : ''}
			>
				Save Private Key
			</button>
			<button
				class="btn btn-gray"
				type="submit"
				disabled={writeNsecDisabled}
				on:click={generateNostrKey}
				title={writeNsecDisabled ? 'Delete the private key first to generate a new one' : ''}
			>
				Generate New Key
			</button>
		</div>
		<button
			class="btn btn-red"
			type="submit"
			disabled={!writeNsecDisabled || readOnlyForm}
			formaction="?/delete"
			on:click={(e) => {
				if (!confirm('Are you sure you want to delete your private key?')) {
					e.preventDefault();
				}
			}}
		>
			Delete Private Key
		</button>
	</div>
</form>

{#if data.nostrPublicKey}
	<p class="break-words">Your NostR public key is: {data.nostrPublicKey}</p>
{/if}

{#if data.nostrPrivateKey}
	{#if data.origin}
		<form action="?/certify" class="flex flex-col gap-4" method="post">
			<button class="btn btn-black self-start" type="submit">Certify</button>
		</form>
	{/if}

	<h2 class="text-2xl">Send message</h2>

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
			Message
			<input class="form-input" type="text" name="message" required />
		</label>

		<button class="btn btn-black self-start" type="submit">Send</button>
	</form>
{/if}

<h2 class="text-2xl">Get metadata</h2>

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

	<button class="btn btn-black self-start" type="submit">Get metadata</button>
</form>

<h2 class="text-2xl">Relays</h2>
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
		Relay
		<input
			class="form-input"
			type="text"
			name="relays"
			placeholder="wss://new.relay.url"
			pattern="wss://.*"
		/>
	</label>
	<button class="btn btn-black self-start" type="submit">Update relay list</button>
</form>
<div class="flex items-center gap-2 text-2xl">
	Intro Message <div
		class="contents"
		title="This is the message sent when receiving a message that doesn't match a command"
	>
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
		Disable Nostr-bot intro message
	</label>
	<button class="btn btn-black self-start" type="submit">Send</button>
</form>
{#if 0}
	<h2 class="text-2xl">Zaps</h2>

	<ul>
		{#each data.receivedMessages.filter((mes) => mes.kind === 9735) as message}
			<li class="break-words">
				{#if message.kind === 4}
					<span title="Encrypted message">'⚡'</span>
				{/if}
				<time datetime={message.createdAt.toJSON()}
					>{message.createdAt.toLocaleString('en-UK')}</time
				>
				| {JSON.stringify(message)}
			</li>
		{/each}
	</ul>
{/if}
<h2 class="text-2xl">Received messages</h2>

<label class="checkbox-label">
	<input type="checkbox" bind:checked={displayPublicMessages} class="form-checkbox" />
	Display public messages (mentions)</label
>

<label class="checkbox-label">
	<input type="checkbox" bind:checked={displayPrivateMessages} class="form-checkbox" />
	Display private messages</label
>
<ul>
	{#each data.receivedMessages as message}
		<li class="break-words">
			{#if message.kind === 4 && displayPrivateMessages}
				<span title="Encrypted message">'🔐'</span>

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
