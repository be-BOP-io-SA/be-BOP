<script lang="ts">
	export let data;
</script>

<h1 class="text-3xl">Zap request debug</h1>

<p class="my-2">
	In-memory log of the last {data.entries.length} invalid NIP-57 zap requests received on
	<code>/lightning/pay</code>. Cleared on server restart.
</p>

<p class="my-2">
	Expected recipient pubkey (from current nsec):
	{#if data.expectedPubkey}
		<code>{data.expectedPubkey}</code>
	{:else}
		<em>Nostr not configured</em>
	{/if}
</p>

{#if data.entries.length === 0}
	<p class="my-4"><em>No invalid zap requests recorded since last restart.</em></p>
{:else}
	<div class="flex flex-col gap-4">
		{#each data.entries as entry, i}
			<div class="border border-gray-300 p-2 rounded">
				<div><strong>#{i + 1}</strong> — {entry.at} — <strong>{entry.error}</strong></div>
				<div>
					p tag (received):
					<code>{entry.pTag ?? '(none)'}</code>
				</div>
				<div>
					expected:
					<code>{entry.expectedPubkey}</code>
				</div>
				<div>
					match:
					<strong>{entry.pTag === entry.expectedPubkey ? 'YES' : 'NO'}</strong>
				</div>
				{#if entry.senderPubkey}
					<div>sender pubkey: <code>{entry.senderPubkey}</code></div>
				{/if}
				{#if entry.eventId}
					<div>event id (e tag): <code>{entry.eventId}</code></div>
				{/if}
				<details class="mt-1">
					<summary>raw nostr param</summary>
					<pre class="whitespace-pre-wrap break-all text-xs">{entry.rawNostrParam}</pre>
				</details>
			</div>
		{/each}
	</div>
{/if}
