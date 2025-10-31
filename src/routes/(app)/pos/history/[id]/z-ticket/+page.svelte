<script lang="ts">
	import ZTicketDisplay from '$lib/components/ZTicketDisplay.svelte';
	import IconArrowLeft from '~icons/ant-design/arrow-left-outlined';
	import { page } from '$app/stores';
	export let data;

	$: isJustClosed = $page.url.searchParams.has('justClosed');
</script>

<main class="max-w-2xl mx-auto p-6">
	{#if isJustClosed}
		<div class="no-print bg-green-50 border border-green-500 rounded-lg p-6 mb-6">
			<h2 class="text-2xl font-bold text-green-800">✅ POS Session Closed Successfully!</h2>
		</div>
	{/if}

	<div class="no-print mb-6">
		<h1 class="text-3xl font-bold mb-4">{isJustClosed ? 'Z Ticket' : 'Z Ticket (Reprint)'}</h1>
	</div>

	<ZTicketDisplay
		zTicketText={data.zTicketText}
		sessionInfo={{
			openedAt: data.session.openedAt,
			closedAt: data.session.closedAt
		}}
	>
		<svelte:fragment slot="back-buttons">
			{#if isJustClosed}
				<a href="/pos" class="btn btn-green">
					<IconArrowLeft class="w-4 h-4 inline" /> POS
				</a>
				<a href="/pos/history" class="btn btn-gray">
					<IconArrowLeft class="w-4 h-4 inline" /> History
				</a>
			{:else}
				<a href="/pos/history/{data.session._id}" class="btn btn-gray">
					<IconArrowLeft class="w-4 h-4 inline" /> Session
				</a>
				<a href="/pos/history" class="btn btn-gray">
					<IconArrowLeft class="w-4 h-4 inline" /> History
				</a>
			{/if}
		</svelte:fragment>
	</ZTicketDisplay>
</main>
