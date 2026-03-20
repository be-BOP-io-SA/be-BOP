<script lang="ts">
	import { enhance } from '$app/forms';
	import { useI18n } from '$lib/i18n.js';
	import { invalidateAll } from '$app/navigation';
	import type { ActionResult } from '@sveltejs/kit';
	import type { SubmitFunction } from '@sveltejs/kit';

	export let data;
	export let form;

	const { locale } = useI18n();

	const MAX_SUBSCRIBER_LINES = 100;

	let showAddForm = false;
	let showImportForm = false;
	let isSubmitting = false;
	let errorMessage = '';
	let successMessage = '';
	let subscriberLines = 1;
	let selectedIds: string[] = [];
	let selectAll = false;

	// Sync selectAll checkbox with selectedIds state
	$: {
		if (tableData.length > 0 && selectedIds.length === tableData.length) {
			selectAll = true;
		} else {
			selectAll = false;
		}
	}

	function toggleSelectAll() {
		selectAll = !selectAll;
		if (selectAll) {
			selectedIds = tableData.map((row) => row.id);
		} else {
			selectedIds = [];
		}
	}

	// Generic handler for actions with confirmation
	function createConfirmHandler(confirmMessage: string, onSuccess?: () => void): SubmitFunction {
		return () => {
			const confirmed = confirm(confirmMessage);
			if (!confirmed) {
				return async () => {};
			}
			return async ({ result, update }: { result: ActionResult; update: () => Promise<void> }) => {
				if (result.type === 'success') {
					await invalidateAll();
					onSuccess?.();
				}
				await update();
			};
		};
	}

	// Bulk operations handler
	const createBulkActionHandler = (actionName: string) =>
		createConfirmHandler(
			`Are you sure you want to ${actionName} ${selectedIds.length} subscription(s)?`,
			() => {
				selectedIds = [];
				selectAll = false;
			}
		);

	// Date format for table display
	const dateTimeFormat: Intl.DateTimeFormatOptions = {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit'
	};

	// Process subscription data for display and export
	$: tableData = data.subscriptions.map((subscription) => {
		const status = subscription.paidUntil > new Date() ? 'active' : 'expired';
		const cancelled = subscription.cancelledAt ? 'Yes' : 'No';

		return {
			id: subscription._id,
			status,
			lastPayment: subscription.updatedAt.toLocaleString($locale, dateTimeFormat),
			paidUntil: subscription.paidUntil.toLocaleString($locale, dateTimeFormat),
			cancelled,
			nostr: subscription.user?.npub ?? '',
			email: subscription.user?.email ?? ''
		};
	});

	// CSV export configuration
	const csvColumns = [
		{ key: 'id', header: 'ID' },
		{ key: 'status', header: 'Status' },
		{ key: 'lastPayment', header: 'Last Payment' },
		{ key: 'paidUntil', header: 'Paid Until' },
		{ key: 'cancelled', header: 'Cancelled' },
		{ key: 'nostr', header: 'NostR' },
		{ key: 'email', header: 'Email' }
	] as const;

	function exportcsv() {
		if (tableData.length === 0) {
			return;
		}

		const headers = csvColumns.map((col) => col.header);
		const csvRows = tableData.map((row) => csvColumns.map((col) => row[col.key]));

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

	function downloadTemplate() {
		const template =
			'email,npub,paidUntil\nuser1@example.com,,2025-12-31 14:30:00\n,npub1xyz...,2026-01-15 09:00:00\nuser2@example.com,,2026-03-20 18:45:00\nuser3@example.com,npub1abc...,2026-06-10 12:00:00';
		downloadCSV(template, 'subscription-import-template.csv');
	}

	let csvContent = '';

	function handleFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = (e) => {
				csvContent = e.target?.result as string;
			};
			reader.readAsText(file);
		}
	}

	// Button label helper
	const getButtonLabel = (isActive: boolean, activeLabel: string, defaultLabel: string) =>
		isActive ? activeLabel : defaultLabel;

	// Handle form responses
	$: if (form) {
		if (form.success) {
			errorMessage = '';
			showAddForm = false;
			showImportForm = false;

			const messageTemplates: Record<string, (val: number | undefined) => string> = {
				imported: (n) => `Successfully imported ${n} subscription(s)`,
				added: (n) => `Successfully added ${n} subscriber(s)`,
				bulkDeleted: (n) => `Successfully deleted ${n} subscription(s)`,
				bulkCancelled: (n) => `Successfully cancelled ${n} subscription(s)`,
				cancelled: () => 'Subscription cancelled successfully',
				deleted: () => 'Subscription deleted successfully'
			};

			const matchedKey = Object.keys(messageTemplates).find(
				(key) => form[key as keyof typeof form] !== undefined
			);
			successMessage = matchedKey
				? messageTemplates[matchedKey](
						(form as Record<string, unknown>)[matchedKey] as number | undefined
				  )
				: 'Operation completed successfully';

			setTimeout(() => (successMessage = ''), 5000);
		} else if (form.error || form.errors || form.message) {
			successMessage = '';
			errorMessage = form.message || form.error || 'Please check the errors below';
		}
	}
</script>

<div class="flex gap-2 items-center flex-wrap">
	<button on:click={() => (showAddForm = !showAddForm)} class="btn btn-blue w-52">
		{getButtonLabel(showAddForm, 'Hide Form', 'Add a subscriber')}
	</button>
	<button on:click={() => (showImportForm = !showImportForm)} class="btn btn-blue w-40">
		{getButtonLabel(showImportForm, 'Hide Form', 'Import CSV')}
	</button>
	<button on:click={exportcsv} class="btn btn-gray w-44">Export to CSV</button>

	{#if selectedIds.length > 0}
		<div class="flex gap-3 items-center ml-4 border-l pl-4">
			<span class="text-base font-semibold">{selectedIds.length} selected</span>
			<button
				type="button"
				on:click={() => {
					selectedIds = [];
					selectAll = false;
				}}
				class="btn btn-gray text-sm"
			>
				Clear selection
			</button>
			<form method="POST" action="?/bulkCancel" use:enhance={createBulkActionHandler('cancel')}>
				<input type="hidden" name="ids" value={JSON.stringify(selectedIds)} />
				<button type="submit" class="btn btn-orange text-sm" title="Cancel selected">
					Cancel
				</button>
			</form>
			<form method="POST" action="?/bulkDelete" use:enhance={createBulkActionHandler('delete')}>
				<input type="hidden" name="ids" value={JSON.stringify(selectedIds)} />
				<button type="submit" class="btn btn-red text-sm" title="Delete selected"> Delete </button>
			</form>
		</div>
	{/if}
</div>

{#if successMessage}
	<div class="alert-banner-success">
		{successMessage}
	</div>
{/if}

{#if errorMessage}
	<div class="alert-banner-error">
		{errorMessage}
	</div>
{/if}

<!-- Add Subscriber Form -->
{#if showAddForm}
	<div class="mb-6 max-w-3xl">
		<h3 class="text-xl mb-3">Add a subscriber</h3>

		<form
			method="POST"
			action="?/addSubscriber"
			use:enhance={() => {
				isSubmitting = true;
				return async ({ result, update }) => {
					await update();
					if (result.type === 'success') {
						await invalidateAll();
						subscriberLines = 1;
					}
					isSubmitting = false;
				};
			}}
			class="space-y-4"
		>
			{#each [...Array(subscriberLines).keys()] as i}
				<div class="flex gap-3 items-start">
					<label class="form-label flex-1">
						<span class="font-medium text-sm">User contact <span class="text-red-500">*</span></span
						>
						<input
							type="text"
							name="subscribers[{i}].emailOrNpub"
							class="form-input mt-1"
							placeholder="email@example.com or npub1..."
							required
						/>
					</label>

					<label class="form-label flex-1">
						<span class="font-medium text-sm"
							>Subscribed until <span class="text-red-500">*</span></span
						>
						<input
							type="datetime-local"
							name="subscribers[{i}].paidUntil"
							class="form-input mt-1"
							required
						/>
					</label>

					<div class="w-9 flex items-start justify-center pt-7">
						{#if i > 0}
							<button
								type="button"
								on:click={() => (subscriberLines -= 1)}
								class="text-xl hover:opacity-70"
								title="Remove"
							>
								🗑️
							</button>
						{/if}
					</div>
				</div>
			{/each}

			<button
				type="button"
				on:click={() => (subscriberLines += 1)}
				disabled={subscriberLines >= MAX_SUBSCRIBER_LINES}
				class="btn btn-green text-sm"
				title={subscriberLines >= MAX_SUBSCRIBER_LINES
					? `Maximum ${MAX_SUBSCRIBER_LINES} subscribers at once`
					: 'Add another subscriber'}
			>
				Add another {subscriberLines >= MAX_SUBSCRIBER_LINES ? `(max ${MAX_SUBSCRIBER_LINES})` : ''}
			</button>

			<div class="flex gap-2 pt-2">
				<button type="submit" disabled={isSubmitting} class="btn btn-blue">
					{getButtonLabel(isSubmitting, 'Adding...', 'Save')}
				</button>
				<button type="button" on:click={() => (showAddForm = false)} class="btn btn-gray">
					Cancel
				</button>
			</div>
		</form>
	</div>
{/if}

<!-- Import CSV Form -->
{#if showImportForm}
	<div class="mb-6 max-w-4xl">
		<h3 class="text-xl mb-3">Import CSV</h3>

		<p class="text-sm mb-2">
			<span class="font-semibold">CSV Format:</span>
			<span class="font-mono bg-gray-100 px-1 py-0.5 rounded text-xs">email</span>,
			<span class="font-mono bg-gray-100 px-1 py-0.5 rounded text-xs">npub</span>,
			<span class="font-mono bg-gray-100 px-1 py-0.5 rounded text-xs">paidUntil</span>
		</p>
		<div class="bg-gray-50 p-2 rounded border border-gray-300 font-mono text-xs mb-3">
			<div>user1@example.com,,2025-12-31 14:30:00</div>
			<div>,npub1xyz...,2026-01-15 09:00:00</div>
			<div>user2@example.com,,2026-03-20 18:45:00</div>
			<div>user3@example.com,npub1abc...,2026-06-10 12:00:00</div>
		</div>
		<button type="button" on:click={downloadTemplate} class="underline text-sm mb-4">
			Download CSV Template
		</button>

		{#if form?.errors && Array.isArray(form.errors)}
			<div class="mb-3 p-3 bg-red-50 border border-red-200 rounded max-h-40 overflow-y-auto">
				<p class="font-bold text-red-700 mb-2 text-sm">
					Errors found ({form.errors.length}):
				</p>
				<ul class="space-y-1">
					{#each form.errors as error}
						<li class="text-xs">
							<span class="font-semibold">Row {error.row}:</span>
							{error.error}
							{#if error.data}
								<span class="text-xs text-gray-600">Data: {error.data}</span>
							{/if}
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		<form
			method="POST"
			action="?/importCsv"
			use:enhance={() => {
				isSubmitting = true;
				return async ({ result, update }) => {
					if (result.type === 'success') {
						await invalidateAll();
					}
					await update();
					if (result.type === 'success') {
						csvContent = '';
					}
					isSubmitting = false;
				};
			}}
			class="space-y-3"
		>
			<label class="form-label">
				<span class="font-medium text-sm">Load CSV file (optional)</span>
				<input
					type="file"
					accept=".csv"
					class="form-input mt-1"
					on:change={handleFileSelect}
					disabled={isSubmitting}
				/>
			</label>

			<label class="form-label">
				<span class="font-medium text-sm">CSV Content <span class="text-red-500">*</span></span>
				<textarea
					name="csvContent"
					bind:value={csvContent}
					rows="8"
					class="form-input mt-1 font-mono text-xs"
					placeholder="email,npub,paidUntil&#10;user@example.com,,2025-12-31&#10;,npub1xyz...,2026-01-15"
					disabled={isSubmitting}
					required
				/>
			</label>

			<div class="flex gap-2 pt-2">
				<button type="submit" disabled={isSubmitting} class="btn btn-blue">
					{getButtonLabel(isSubmitting, 'Importing...', 'Save')}
				</button>
				<button type="button" on:click={() => (showImportForm = false)} class="btn btn-gray">
					Cancel
				</button>
			</div>
		</form>
	</div>
{/if}

<!-- Subscribers Table -->
<div class="overflow-x-auto">
	<table class="min-w-full divide-y divide-gray-200">
		<thead>
			<tr>
				<th class="data-table-header w-12">
					<input
						type="checkbox"
						class="form-checkbox"
						checked={selectAll}
						on:change={toggleSelectAll}
					/>
				</th>
				<th class="data-table-header">id</th>
				<th class="data-table-header">status</th>
				<th class="data-table-header">Last Payment</th>
				<th class="data-table-header">Paid Until</th>
				<th class="data-table-header">Cancelled</th>
				<th class="data-table-header">NostR</th>
				<th class="data-table-header">Email</th>
				<th class="data-table-header">Actions</th>
			</tr>
		</thead>
		<tbody class="bg-white divide-y divide-gray-200">
			{#each tableData as row}
				<tr class:bg-blue-50={selectedIds.includes(row.id)}>
					<td class="data-table-cell">
						<input type="checkbox" class="form-checkbox" bind:group={selectedIds} value={row.id} />
					</td>
					<td class="data-table-cell">
						<span class="font-mono text-xs">{row.id}</span>
					</td>
					<td class="data-table-cell">
						{#if row.status === 'active'}
							<span class="text-green-700 font-semibold">active</span>
						{:else}
							<span class="text-red-700">expired</span>
						{/if}
					</td>
					<td class="data-table-cell">{row.lastPayment}</td>
					<td class="data-table-cell">{row.paidUntil}</td>
					<td class="data-table-cell">
						{#if row.cancelled === 'Yes'}
							<span class="text-gray-600">Yes</span>
						{:else}
							<div class="flex flex-col items-center gap-0.5">
								<span class="text-sm">No</span>
								<form
									method="POST"
									action="?/cancelSubscriber"
									use:enhance={createConfirmHandler(
										'Are you sure you want to cancel this subscription?'
									)}
								>
									<input type="hidden" name="subscriptionId" value={row.id} />
									<button
										type="submit"
										class="btn-orange text-xs px-2 py-0.5 rounded"
										title="Cancel subscription"
									>
										Cancel
									</button>
								</form>
							</div>
						{/if}
					</td>
					<td class="data-table-cell">
						{#if row.nostr}
							<div class="font-mono text-xs max-w-[200px] max-h-[3rem] overflow-auto break-all">
								{row.nostr}
							</div>
						{/if}
					</td>
					<td class="data-table-cell max-w-[200px] truncate">{row.email}</td>
					<td class="data-table-cell">
						<form
							method="POST"
							action="?/deleteSubscriber"
							use:enhance={createConfirmHandler(
								'Are you sure you want to delete this subscription?'
							)}
						>
							<input type="hidden" name="subscriptionId" value={row.id} />
							<button type="submit" class="text-xl hover:opacity-70" title="Delete subscription">
								🗑️
							</button>
						</form>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

{#if tableData.length === 0}
	<p class="text-gray-600 text-center py-8">No subscribers yet</p>
{/if}
