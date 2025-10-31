<script lang="ts">
	import IconWarning from '~icons/ant-design/warning-outlined';

	export let data;

	let cashClosingAmount: number | null = 0;
	let bankDepositAmount: number | null = 0;
	let justification = '';

	$: cashIncome = data.incomes
		.filter((i) => i.paymentSubtype === 'cash')
		.reduce((sum, i) => sum + i.amount, 0);
	$: theoreticalClosing = data.session.cashOpening.amount + cashIncome - (bankDepositAmount ?? 0);
	$: cashDelta = (cashClosingAmount ?? 0) - theoreticalClosing;
	$: hasCashDelta = Math.abs(cashDelta) > 0.01;
	$: shouldShowJustification = hasCashDelta;
	$: isJustificationRequired = data.cashDeltaJustificationMandatory && hasCashDelta;
	$: canSubmit = isJustificationRequired ? justification.trim().length > 0 : true;
</script>

<main class="max-w-4xl mx-auto p-6">
	<h1 class="text-3xl font-bold mb-6">Close the PoS & Generate Z ticket</h1>

	<!-- Preview Section - FIRST -->
	<div class="bg-gray-50 border rounded-lg p-6 mb-6">
		<h2 class="text-xl font-bold mb-4">
			Hello {data.user?.alias || data.user?.login || 'User'}!
		</h2>

		<div class="space-y-4">
			<!-- Daily Incomes -->
			<div>
				<p class="font-semibold text-green-700 mb-2">Daily incomes:</p>
				{#each data.incomes as income}
					<p class="ml-4">
						• {income.paymentSubtype
							? `${income.paymentMethod} / ${income.paymentSubtype}`
							: income.paymentMethod}: {income.amount.toFixed(2)}
						{income.currency}
					</p>
				{/each}
				<p class="font-bold mt-3">Daily incomes total:</p>
				<p class="ml-0">
					{data.incomes.reduce((sum, i) => sum + i.amount, 0).toFixed(2)}
					{data.session.cashOpening.currency}
				</p>
			</div>

			<!-- Daily Outcomes -->
			<div>
				<p class="font-semibold text-blue-700 mb-2">Daily outcomes:</p>
				{#if (bankDepositAmount ?? 0) > 0}
					<p class="ml-4">
						• Bank deposit: {(bankDepositAmount ?? 0).toFixed(2)}
						{data.session.cashOpening.currency}
					</p>
				{:else}
					<p class="ml-4 text-gray-500">No outcomes recorded</p>
				{/if}
				<p class="font-bold mt-3">Daily outcomes total:</p>
				<p class="ml-0">
					{(bankDepositAmount ?? 0).toFixed(2)}
					{data.session.cashOpening.currency}
				</p>
			</div>

			<!-- Cash Balance -->
			<div>
				<p class="font-semibold mb-2">Cash balance:</p>
				<p class="ml-4">
					• Initial cash at opening: {data.session.cashOpening.amount.toFixed(2)}
					{data.session.cashOpening.currency}
				</p>
				<p class="ml-4">
					• Daily cash incomes: {cashIncome.toFixed(2)}
					{data.session.cashOpening.currency}
				</p>
				<p class="ml-4">
					• Daily cash outcomes: {(bankDepositAmount ?? 0).toFixed(2)}
					{data.session.cashOpening.currency}
				</p>
				<p class="ml-4">
					• Remaining cash at daily closing: {(cashClosingAmount ?? 0).toFixed(2)}
					{data.session.cashOpening.currency}
				</p>
				<p class="ml-4">
					• Theorical remaining cash at daily closing: {theoreticalClosing.toFixed(2)}
					{data.session.cashOpening.currency}
				</p>
			</div>

			<!-- Cash Delta Status -->
			{#if (cashClosingAmount ?? 0) > 0}
				{#if Math.abs(cashDelta) > 0.01}
					<div class="pt-3 border-t border-red-300">
						<p class="font-semibold text-red-600 mb-2">Your cash balance is incoherent ❌</p>
						<p class="ml-4">
							• Remaining cash expected: {theoreticalClosing.toFixed(2)}
							{data.session.cashOpening.currency}
						</p>
						<p class="ml-4">
							• Remaining cash declared: {(cashClosingAmount ?? 0).toFixed(2)}
							{data.session.cashOpening.currency}
						</p>
						<p class="ml-4 font-bold text-orange-600">
							• Remaning cash delta: {cashDelta >= 0 ? '+' : ''}{cashDelta.toFixed(2)}
							{data.session.cashOpening.currency}
						</p>
					</div>
				{:else}
					<div class="pt-3 border-t border-green-300">
						<p class="font-semibold text-green-600">Your cash balance is coherent ✅</p>
					</div>
				{/if}
			{/if}
		</div>
	</div>

	<!-- Input Form - AFTER Preview -->
	<form method="POST" class="space-y-6">
		<input type="hidden" name="sessionId" value={data.session._id} />
		<input type="hidden" name="currency" value={data.session.cashOpening.currency} />

		<div>
			<label for="bankDepositAmount" class="form-label"> Bank deposit amount </label>
			<div class="flex items-center gap-2">
				<input
					type="number"
					step="0.01"
					min="0"
					name="bankDepositAmount"
					id="bankDepositAmount"
					bind:value={bankDepositAmount}
					class="form-input flex-1"
					required
				/>
				<span class="text-gray-600">{data.session.cashOpening.currency}</span>
			</div>
		</div>

		<div>
			<label for="cashClosingAmount" class="form-label">
				Actual cash in drawer (manual count)
			</label>
			<div class="flex items-center gap-2">
				<input
					type="number"
					step="0.01"
					min="0"
					name="cashClosingAmount"
					id="cashClosingAmount"
					bind:value={cashClosingAmount}
					class="form-input flex-1"
					required
				/>
				<span class="text-gray-600">{data.session.cashOpening.currency}</span>
			</div>
		</div>

		{#if shouldShowJustification}
			<div class="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
				<label for="justification" class="form-label text-yellow-900">
					<strong class="inline-flex items-center gap-1">
						<IconWarning class="w-4 h-4" />
						Justification {data.cashDeltaJustificationMandatory ? 'required (always)' : 'optional'}
					</strong>
					<br />
					{#if data.cashDeltaJustificationMandatory}
						Please provide a comment about today's cash operations:
					{:else}
						You may explain the cash difference (optional):
					{/if}
				</label>
				<textarea
					name="justification"
					id="justification"
					bind:value={justification}
					class="form-input mt-2"
					rows="3"
					required={isJustificationRequired}
					placeholder={data.cashDeltaJustificationMandatory
						? 'e.g., Normal day, no incidents'
						: 'e.g., Jeffrey forgot to tip table 12 lunch (40 CHF)'}
				></textarea>
			</div>
		{/if}

		<div class="flex gap-3">
			<button
				type="submit"
				disabled={!canSubmit}
				class="btn"
				class:btn-green={canSubmit && !shouldShowJustification}
				class:btn-orange={canSubmit && shouldShowJustification}
				class:btn-gray={!canSubmit}
			>
				Confirm closing & generate Z ticket
			</button>
			<a href="/pos" class="btn btn-gray"> Cancel </a>
		</div>
	</form>
</main>
