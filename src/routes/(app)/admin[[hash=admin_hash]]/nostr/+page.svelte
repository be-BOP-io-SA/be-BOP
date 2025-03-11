<script lang="ts">
	import IconInfo from '$lib/components/icons/IconInfo.svelte';
	import { bech32 } from 'bech32';
	export let data;
	export let form;

	async function createNostrKey() {
		const hex = crypto.getRandomValues(new Uint8Array(32));

		prompt('Your NostR private key is:', bech32.encode('nsec', bech32.toWords(hex)));
	}
	let relays = data.nostrRelays;
</script>

<h1 class="text-3xl">NostR</h1>

{#if form?.success}
	<p class="alert-success">
		{form.success}
	</p>
{/if}

{#if form?.events}
	{#each form.events as event}
		<pre class="font-mono">{JSON.stringify(event, null, 2)}</pre>
	{/each}
{/if}

{#if data.nostrPrivateKey}
	<p class="break-words">Your NostR private key is: {data.nostrPrivateKey}</p>
	<p class="break-words">Your NostR public key is: {data.nostrPublicKey}</p>

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
{:else}
	<p>You don't have a NostR private key yet.</p>
	<button class="btn btn-black self-start" type="button" on:click={createNostrKey}
		>Create NostR private key</button
	>
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
<h2 class="text-2xl">Zaps</h2>

<ul>
	{#each data.receivedMessages.filter((mes) => mes.kind === 9735) as message}
		<li class="break-words">
			{#if message.kind === 4}
				<span title="Encrypted message">'⚡'</span>
			{/if}
			<time datetime={message.createdAt.toJSON()}>{message.createdAt.toLocaleString('en-UK')}</time>
			| {JSON.stringify(message)}
		</li>
	{/each}
</ul>
<h2 class="text-2xl">Received messages</h2>

<ul>
	{#each data.receivedMessages as message}
		<li class="break-words">
			{#if message.kind === 4}
				<span title="Encrypted message">'🔐'</span>
				<time datetime={message.createdAt.toJSON()}
					>{message.createdAt.toLocaleString('en-UK')}</time
				>
				|
				{message.source} | {message.content}
			{/if}
		</li>
	{/each}
</ul>
