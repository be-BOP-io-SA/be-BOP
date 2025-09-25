<script lang="ts">
	import { enhance } from '$app/forms';
	import { useI18n } from '$lib/i18n.js';

	export let data;

	function exportcsv() {
		const table = document.getElementById('subscription-table');
		if (!table) {
			return;
		}

		const rows = table.querySelectorAll('tr');
		const data = Array.from(rows).map((row) =>
			Array.from(row.querySelectorAll('td')).map((cell) => cell.innerText.trim())
		);

		const csvRows = data.map((row) => row.join(',')).join('\n');
		const csvData = 'ID,Status,Last Payment,Paid Until,Cancelled,NostR,Email\n' + csvRows;

		downloadCSV(csvData, 'subscriptions.csv');
	}

	function downloadCSV(csvData: string, filename: string) {
		const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvData);
		const link = document.createElement('a');
		link.setAttribute('href', csvContent);
		link.setAttribute('download', filename);
		document.body.appendChild(link);
		link.click();
	}

	const { locale } = useI18n();
</script>

<!-- <h1 class="text-3xl">Edit a product</h1> -->

<button
	on:click={exportcsv}
	id="export-button"
	class="bg-blue-500 mx-auto hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
>
	Export CSV
</button>
<div class="container mx-auto p-4">
	<table class="min-w-full divide-y divide-gray-200" id="subscription-table">
		<thead>
			<tr>
				<th
					class="px-6 py-3 bg-gray-200 text-left text-xs leading-4 font-medium text-gray-600 uppercase tracking-wider"
				>
					id
				</th>
				<th
					class="px-6 py-3 bg-gray-200 text-left text-xs leading-4 font-medium text-gray-600 uppercase tracking-wider"
				>
					status
				</th>
				<th
					class="px-6 py-3 bg-gray-200 text-left text-xs leading-4 font-medium text-gray-600 uppercase tracking-wider"
				>
					Last Payment
				</th>
				<th
					class="px-6 py-3 bg-gray-200 text-left text-xs leading-4 font-medium text-gray-600 uppercase tracking-wider"
				>
					Paid Until
				</th>
				<th
					class="px-6 py-3 bg-gray-200 text-left text-xs leading-4 font-medium text-gray-600 uppercase tracking-wider"
				>
					Cancelled
				</th>
				<th
					class="px-6 py-3 bg-gray-200 text-left text-xs leading-4 font-medium text-gray-600 uppercase tracking-wider"
				>
					NostR
				</th>
				<th
					class="px-6 py-3 bg-gray-200 text-left text-xs leading-4 font-medium text-gray-600 uppercase tracking-wider"
				>
					Email
				</th>
			</tr>
		</thead>
		<tbody class="bg-white divide-y divide-gray-200">
			{#if data.subscriptions.length > 0}
				{#each data.subscriptions as subscription}
					{@const status = subscription.paidUntil > new Date() ? 'active' : 'expired'}
					<tr>
						<td class="px-6 py-4 whitespace-no-wrap"> {subscription._id}</td>
						<td
							class="px-6 py-4 whitespace-no-wrap {status === 'active'
								? 'text-green-500'
								: 'text-red-500'} font-bold"
						>
							{status}
						</td>
						<td class="px-6 py-4 whitespace-no-wrap">
							{subscription.updatedAt.toLocaleDateString($locale)}</td
						>
						<td class="px-6 py-4 whitespace-no-wrap">
							{subscription.paidUntil.toLocaleDateString($locale)}
						</td>
						<td class="px-6 py-4 whitespace-no-wrap">
							{#if subscription.cancelledAt}
								Yes
							{:else}
								No

								{#if status === 'active'}
									<form action="?/cancel" method="post" use:enhance>
										<button type="submit" class="btn btn-red">Cancel</button>
									</form>
								{/if}
							{/if}
						</td>
						<td class="px-6 py-4 whitespace-no-wrap"> {subscription.user?.npub ?? ''}</td>
						<td class="px-6 py-4 whitespace-no-wrap"> {subscription.user?.email ?? ''}</td>
					</tr>
				{/each}
			{:else}
				<p>empty data !</p>
			{/if}
		</tbody>
	</table>
</div>
