<script lang="ts">
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

	function formatDateTime(date: Date): string {
		return new Date(date).toLocaleString('en-GB', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	}

	function getUserDisplay(user: { alias?: string; login?: string } | null): string {
		if (!user) {
			return 'Unknown';
		}
		return user.alias || user.login || 'Unknown';
	}

	$: totalIncome = data.incomes.reduce((sum, i) => sum + i.amount, 0);
	$: totalOutcomes = data.session.dailyOutcomes.reduce(
		(sum: number, o: { amount: number }) => sum + o.amount,
		0
	);
	$: hasCashDelta = data.session.cashDelta && Math.abs(data.session.cashDelta.amount) > 0.01;
</script>

<main class="max-w-4xl mx-auto p-6">
	<div class="mb-6">
		<h1 class="text-3xl font-bold mb-2">POS Session Details</h1>
		<div class="flex items-center gap-3">
			<span
				class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800"
			>
				Closed Session
			</span>
			<span class="text-gray-600 text-sm">Duration: {formatDuration(data.session.duration)}</span>
		</div>
	</div>

	<div class="space-y-6">
		<!-- Session Info -->
		<div class="bg-white border rounded-lg p-6">
			<h2 class="text-xl font-bold mb-4">Session Information</h2>
			<div class="grid grid-cols-2 gap-4">
				<div>
					<p class="text-sm text-gray-600">Opened at</p>
					<p class="font-medium">{formatDateTime(data.session.openedAt)}</p>
					<p class="text-sm text-gray-600 mt-1">by {getUserDisplay(data.session.openedBy)}</p>
				</div>
				{#if data.session.closedAt}
					<div>
						<p class="text-sm text-gray-600">Closed at</p>
						<p class="font-medium">{formatDateTime(data.session.closedAt)}</p>
						{#if data.session.closedBy}
							<p class="text-sm text-gray-600 mt-1">by {getUserDisplay(data.session.closedBy)}</p>
						{/if}
					</div>
				{/if}
			</div>
		</div>

		<!-- Cash Balance -->
		<div class="bg-white border rounded-lg p-6">
			<h2 class="text-xl font-bold mb-4">Cash Balance</h2>
			<div class="space-y-3">
				<div class="flex justify-between">
					<span class="text-gray-600">Opening cash:</span>
					<span class="font-medium"
						>{data.session.cashOpening.amount.toFixed(2)} {data.session.cashOpening.currency}</span
					>
				</div>
				{#if data.session.cashClosing}
					<div class="flex justify-between">
						<span class="text-gray-600">Closing cash (actual):</span>
						<span class="font-medium"
							>{data.session.cashClosing.amount.toFixed(2)}
							{data.session.cashClosing.currency}</span
						>
					</div>
				{/if}
				{#if data.session.cashClosingTheoretical}
					<div class="flex justify-between">
						<span class="text-gray-600">Closing cash (theoretical):</span>
						<span class="font-medium"
							>{data.session.cashClosingTheoretical.amount.toFixed(2)}
							{data.session.cashClosingTheoretical.currency}</span
						>
					</div>
				{/if}
				{#if hasCashDelta && data.session.cashDelta}
					<div class="flex justify-between pt-3 border-t border-red-200">
						<span class="text-red-600 font-semibold">Cash delta:</span>
						<span class="font-bold text-red-600"
							>{data.session.cashDelta.amount >= 0
								? '+'
								: ''}{data.session.cashDelta.amount.toFixed(2)}
							{data.session.cashDelta.currency}</span
						>
					</div>
					{#if data.session.cashDeltaJustification}
						<div class="bg-yellow-50 border border-yellow-200 rounded p-3">
							<p class="text-sm font-semibold text-yellow-900 mb-1">Justification:</p>
							<p class="text-sm text-yellow-800">{data.session.cashDeltaJustification}</p>
						</div>
					{/if}
				{/if}
			</div>
		</div>

		<!-- Daily Incomes -->
		<div class="bg-white border rounded-lg p-6">
			<h2 class="text-xl font-bold mb-4">Daily Incomes</h2>
			{#if data.incomes.length > 0}
				<div class="space-y-2">
					{#each data.incomes as income}
						<div class="flex justify-between">
							<span class="text-gray-600 capitalize"
								>{income.paymentSubtype
									? `${income.paymentMethod} / ${income.paymentSubtype}`
									: income.paymentMethod}:</span
							>
							<span class="font-medium">{income.amount.toFixed(2)} {income.currency}</span>
						</div>
					{/each}
					<div class="flex justify-between pt-3 border-t font-bold">
						<span>Total:</span>
						<span>{totalIncome.toFixed(2)} {data.session.cashOpening.currency}</span>
					</div>
				</div>
			{:else}
				<p class="text-gray-500">No incomes recorded</p>
			{/if}
		</div>

		<!-- Daily Outcomes -->
		<div class="bg-white border rounded-lg p-6">
			<h2 class="text-xl font-bold mb-4">Daily Outcomes</h2>
			{#if data.session.dailyOutcomes.length > 0}
				<div class="space-y-2">
					{#each data.session.dailyOutcomes as outcome}
						<div class="flex justify-between">
							<span class="text-gray-600 capitalize">{outcome.category}:</span>
							<span class="font-medium">{outcome.amount.toFixed(2)} {outcome.currency}</span>
						</div>
					{/each}
					<div class="flex justify-between pt-3 border-t font-bold">
						<span>Total:</span>
						<span>{totalOutcomes.toFixed(2)} {data.session.cashOpening.currency}</span>
					</div>
				</div>
			{:else}
				<p class="text-gray-500">No outcomes recorded</p>
			{/if}
		</div>

		<!-- X Tickets -->
		<div class="bg-white border rounded-lg p-6">
			<h2 class="text-xl font-bold mb-4">X Tickets Generated</h2>
			{#if data.session.xTickets.length > 0}
				<div class="space-y-2">
					{#each data.session.xTickets as xTicket, index}
						<div class="flex justify-between items-center py-2 border-b last:border-b-0">
							<div>
								<span class="font-medium">X Ticket #{index + 1}</span>
								<span class="text-sm text-gray-600 ml-2">
									by {getUserDisplay({
										alias: xTicket.generatedBy.userAlias,
										login: xTicket.generatedBy.userLogin
									})}
								</span>
							</div>
							<span class="text-sm text-gray-600">{formatDateTime(xTicket.generatedAt)}</span>
						</div>
					{/each}
				</div>
				<p class="text-sm text-gray-600 mt-4">Total: {data.session.xTickets.length} X tickets</p>
			{:else}
				<p class="text-gray-500">No X tickets generated</p>
			{/if}
		</div>
	</div>

	<div class="mt-6 flex gap-3">
		{#if data.session.status === 'closed'}
			<a href="/pos/history/{data.session._id}/z-ticket" class="btn btn-green">View Z Ticket</a>
		{/if}
		<a href="/pos/history" class="btn btn-gray">
			<IconArrowLeft class="w-4 h-4 inline" /> Back to History
		</a>
	</div>
</main>
