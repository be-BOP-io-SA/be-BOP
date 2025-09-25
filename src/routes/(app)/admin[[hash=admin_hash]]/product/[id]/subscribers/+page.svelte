<script lang="ts">
	import { enhance } from '$app/forms';
	import { useI18n } from '$lib/i18n.js';

	export let data;

	const { locale } = useI18n();

	// Process subscription data for display and export
	$: tableData = data.subscriptions.map((subscription) => {
		const status = subscription.paidUntil > new Date() ? 'active' : 'expired';
		const cancelled = subscription.cancelledAt ? 'Yes' : 'No';

		return {
			id: subscription._id,
			status,
			lastPayment: subscription.updatedAt.toLocaleDateString($locale),
			paidUntil: subscription.paidUntil.toLocaleDateString($locale),
			cancelled,
			nostr: subscription.user?.npub ?? '',
			email: subscription.user?.email ?? '',
			// Keep original subscription for actions
			originalSubscription: subscription
		};
	});

	function exportcsv() {
		if (tableData.length === 0) {
			return;
		}

		const headers = ['ID', 'Status', 'Last Payment', 'Paid Until', 'Cancelled', 'NostR', 'Email'];
		const csvRows = tableData.map((row) => [
			row.id,
			row.status,
			row.lastPayment,
			row.paidUntil,
			row.cancelled,
			row.nostr,
			row.email
		]);

		const csvContent = [headers, ...csvRows]
			.map((row) => row.map((field) => `"${field}"`).join(','))
			.join('\n');

		downloadCSV(csvContent, 'subscriptions.csv');
	}

	function downloadCSV(csvData: string, filename: string) {
		const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvData);
		const link = document.createElement('a');
		link.setAttribute('href', csvContent);
		link.setAttribute('download', filename);
		document.body.appendChild(link);
		link.click();
	}
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
			{#if tableData.length > 0}
				{#each tableData as row}
					<tr>
						<td class="px-6 py-4 whitespace-no-wrap">{row.id}</td>
						<td
							class="px-6 py-4 whitespace-no-wrap {row.status === 'active'
								? 'text-green-500'
								: 'text-red-500'} font-bold"
						>
							{row.status}
						</td>
						<td class="px-6 py-4 whitespace-no-wrap">
							{row.lastPayment}
						</td>
						<td class="px-6 py-4 whitespace-no-wrap">
							{row.paidUntil}
						</td>
						<td class="px-6 py-4 whitespace-no-wrap">
							{#if row.originalSubscription.cancelledAt}
								Yes
							{:else if row.status === 'active'}
								<!-- instead of showing "No", we just the cancel button when the subscription is active -->
								<form
									action="{data.adminPrefix}/product/{row.originalSubscription
										.productId}/subscribers/{row.originalSubscription._id}?/cancel"
									method="post"
									use:enhance
								>
									<button type="submit" class="btn btn-red">Cancel</button>
								</form>
							{:else}
								No
							{/if}
						</td>
						<td class="px-6 py-4 whitespace-no-wrap">{row.nostr}</td>
						<td class="px-6 py-4 whitespace-no-wrap">{row.email}</td>
					</tr>
				{/each}
			{:else}
				<p>empty data !</p>
			{/if}
		</tbody>
	</table>
</div>
