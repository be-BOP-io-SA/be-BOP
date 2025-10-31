<script lang="ts">
	import IconWarning from '~icons/ant-design/warning-outlined';
	import IconArrowLeft from '~icons/ant-design/arrow-left-outlined';

	export let data;

	function formatDuration(minutes: number): string {
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		if (hours > 0) {
			return `${hours}h ${mins}m`;
		}
		return `${mins}m`;
	}

	function formatDate(date: Date): string {
		return new Date(date).toLocaleDateString('en-GB');
	}

	function formatTime(date: Date): string {
		return new Date(date).toLocaleTimeString('en-GB', {
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getUserDisplay(user: { alias?: string; login?: string } | null): string {
		if (!user) {
			return 'Unknown';
		}
		return user.alias || user.login || 'Unknown';
	}
</script>

<main class="max-w-7xl mx-auto p-6">
	<div class="mb-6">
		<h1 class="text-3xl font-bold mb-4">POS Sessions History</h1>

		<form method="GET" class="flex gap-4 items-end mb-6">
			<div>
				<label for="dateFrom" class="form-label">From date</label>
				<input type="date" id="dateFrom" name="dateFrom" value={data.dateFrom} class="form-input" />
			</div>
			<div>
				<label for="dateTo" class="form-label">To date</label>
				<input type="date" id="dateTo" name="dateTo" value={data.dateTo} class="form-input" />
			</div>
			<button type="submit" class="btn btn-blue">Filter</button>
			<a href="/pos/history" class="btn btn-gray">Clear</a>
		</form>
	</div>

	{#if data.sessions.length === 0}
		<div class="bg-gray-50 border rounded-lg p-8 text-center">
			<p class="text-gray-600">No POS sessions found</p>
		</div>
	{:else}
		<div class="overflow-x-auto">
			<table class="admin-table">
				<thead class="admin-table-header">
					<tr>
						<th class="admin-table-th text-left">Status</th>
						<th class="admin-table-th text-left">Date</th>
						<th class="admin-table-th text-left">Opening</th>
						<th class="admin-table-th text-left">Closing</th>
						<th class="admin-table-th text-left">Duration</th>
						<th class="admin-table-th text-left">Opened By</th>
						<th class="admin-table-th text-left">Closed By</th>
						<th class="admin-table-th text-right">Cash Opening</th>
						<th class="admin-table-th text-right">Cash Closing</th>
						<th class="admin-table-th text-right">Total Income</th>
						<th class="admin-table-th text-center">X Tickets</th>
						<th class="admin-table-th text-center">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each data.sessions as session}
						<tr>
							<td class="admin-table-td">
								{#if session.status === 'active'}
									<span
										class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
									>
										Active
									</span>
								{:else}
									<span
										class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
									>
										Closed
									</span>
								{/if}
							</td>
							<td class="admin-table-td text-sm">
								{formatDate(session.openedAt)}
							</td>
							<td class="admin-table-td text-sm">
								{formatTime(session.openedAt)}
							</td>
							<td class="admin-table-td text-sm">
								{#if session.closedAt}
									{formatTime(session.closedAt)}
								{:else}
									<span class="text-gray-400">—</span>
								{/if}
							</td>
							<td class="admin-table-td text-sm">
								{formatDuration(session.duration)}
							</td>
							<td class="admin-table-td text-sm">
								{getUserDisplay(session.openedBy)}
							</td>
							<td class="admin-table-td text-sm">
								{#if session.closedBy}
									{getUserDisplay(session.closedBy)}
								{:else}
									<span class="text-gray-400">—</span>
								{/if}
							</td>
							<td class="admin-table-td text-sm text-right">
								{session.cashOpening.amount.toFixed(2)}
								{session.cashOpening.currency}
							</td>
							<td class="admin-table-td text-sm text-right">
								{#if session.cashClosing}
									<div class="inline-flex items-center gap-1">
										{session.cashClosing.amount.toFixed(2)}
										{session.cashClosing.currency}
										{#if session.hasCashDelta}
											<IconWarning class="w-4 h-4 text-orange-600" title="Cash delta detected" />
										{/if}
									</div>
								{:else}
									<span class="text-gray-400">—</span>
								{/if}
							</td>
							<td class="admin-table-td text-sm text-right font-medium">
								{#if session.totalIncome > 0}
									{session.totalIncome.toFixed(2)} {session.cashOpening.currency}
								{:else}
									<span class="text-gray-400">—</span>
								{/if}
							</td>
							<td class="admin-table-td text-sm text-center">
								{session.xTicketsCount}
							</td>
							<td class="admin-table-td">
								<div class="flex gap-2 justify-center">
									{#if session.status === 'closed'}
										<a
											href="/pos/history/{session._id}"
											class="btn btn-blue text-sm px-4 py-2"
											title="View details"
										>
											View
										</a>
										<a
											href="/pos/history/{session._id}/z-ticket"
											class="btn btn-green text-sm px-4 py-2"
											title="Reprint Z-ticket"
										>
											Z-ticket
										</a>
									{:else}
										<span class="text-gray-400 text-sm">Active session</span>
									{/if}
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<div class="mt-4 text-sm text-gray-600">
			Showing {data.sessions.length} session{data.sessions.length !== 1 ? 's' : ''}
		</div>
	{/if}

	<div class="mt-6">
		<a href="/pos" class="btn btn-gray">
			<IconArrowLeft class="w-4 h-4 inline" /> Back to POS
		</a>
	</div>
</main>
