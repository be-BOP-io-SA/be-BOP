<script lang="ts">
	import { applyAction, enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { ActionData, PageData } from './$types';
	import { generateId } from '$lib/utils/generateId';

	export let data: PageData;
	export let form: ActionData;

	let showCreateForm = false;
	let editingSubtype: (typeof data.subtypes)[0] | null = null;
	let nameInput = '';
	let slugInput = '';
	let selectedProcessor = '';
	let urlInput = '';

	$: if (!editingSubtype && nameInput) {
		slugInput = generateId(nameInput, false);
	}

	$: tapToPayUrlDisabled = !selectedProcessor;

	function resetForm() {
		showCreateForm = false;
		editingSubtype = null;
		nameInput = '';
		slugInput = '';
		selectedProcessor = '';
		urlInput = '';
	}
</script>

<h1 class="text-3xl mb-4">PoS Payment Subtypes</h1>

<p class="text-gray-600 mb-6">
	Configure different types of point-of-sale payments (cash, check, terminals, etc.)
</p>

{#if form?.error}
	<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
		{form.error}
	</div>
{/if}

{#if form?.success}
	<div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
		Operation successful!
	</div>
{/if}

<div class="flex flex-col gap-6">
	<!-- Existing Subtypes List -->
	<section>
		<h2 class="text-2xl mb-4">Existing Subtypes</h2>

		{#if data.subtypes.length === 0}
			<p class="text-gray-500">No subtypes configured yet. Create your first one below!</p>
		{:else}
			<div class="flex flex-col gap-4">
				{#each data.subtypes as subtype}
					<div
						class="border rounded-lg p-4 flex justify-between items-start {subtype.disabled
							? 'bg-gray-50 opacity-60'
							: ''}"
					>
						<div class="flex-1">
							<div class="flex items-center gap-2">
								<h3 class="font-bold text-lg">{subtype.name}</h3>
								{#if subtype.slug === 'cash'}
									<span class="text-xs bg-blue-600 text-white px-2 py-1 rounded">System</span>
								{/if}
								{#if subtype.disabled}
									<span class="text-xs bg-gray-500 text-white px-2 py-1 rounded">Disabled</span>
								{/if}
							</div>
							<p class="text-sm text-gray-600">
								Slug: <code class="bg-gray-100 px-1 rounded">{subtype.slug}</code>
							</p>

							{#if subtype.description}
								<p class="text-sm mt-2">{subtype.description}</p>
							{/if}

							{#if subtype.tapToPay}
								<div class="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
									<p class="text-sm font-semibold text-blue-900">🔗 Tap-to-pay enabled</p>
									<p class="text-sm text-blue-800">
										Processor: <strong>{subtype.tapToPay.processor}</strong>
									</p>
									{#if subtype.tapToPay.onActivationUrl}
										<p class="text-sm text-blue-800">URL: {subtype.tapToPay.onActivationUrl}</p>
									{/if}
								</div>
							{/if}
						</div>

						<div class="flex gap-2 ml-4">
							<button
								type="button"
								class="btn btn-sm"
								disabled={subtype.slug === 'cash'}
								on:click={() => {
									editingSubtype = subtype;
									showCreateForm = false;
									nameInput = subtype.name;
									selectedProcessor = subtype.tapToPay?.processor || '';
									urlInput = subtype.tapToPay?.onActivationUrl || '';
								}}
							>
								Edit
							</button>

							<form
								method="post"
								action="?/delete"
								use:enhance={() => {
									return async ({ result }) => {
										await applyAction(result);
										if (result.type === 'success') {
											await invalidateAll();
										}
									};
								}}
							>
								<input type="hidden" name="id" value={subtype._id.toString()} />
								<button
									type="submit"
									class="btn btn-sm btn-danger"
									disabled={subtype.slug === 'cash'}
									on:click={(e) => {
										if (!confirm(`Delete "${subtype.name}"?\n\nThis action cannot be undone.`)) {
											e.preventDefault();
										}
									}}
								>
									Delete
								</button>
							</form>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</section>

	<!-- Create/Edit Form Toggle -->
	{#if !showCreateForm && !editingSubtype}
		<button type="button" class="btn btn-black self-start" on:click={() => (showCreateForm = true)}>
			+ Create New Subtype
		</button>
	{/if}

	<!-- Create/Edit Form -->
	{#if showCreateForm || editingSubtype}
		<form
			method="post"
			action="?/{editingSubtype ? 'update' : 'create'}"
			class="border rounded-lg p-6 flex flex-col gap-4 bg-gray-50"
			use:enhance={() => {
				return async ({ result }) => {
					await applyAction(result);
					if (result.type === 'success') {
						await invalidateAll();
						resetForm();
					}
				};
			}}
		>
			<h3 class="text-xl font-bold">
				{editingSubtype ? `Edit "${editingSubtype.name}"` : 'Create New Subtype'}
			</h3>

			{#if editingSubtype}
				<input type="hidden" name="id" value={editingSubtype._id.toString()} />
			{/if}

			<!-- Display Name -->
			<label class="form-label">
				Display Name <span class="text-red-500">*</span>
				<input
					type="text"
					name="name"
					class="form-input"
					bind:value={nameInput}
					placeholder="e.g. Cash, Check, External POS Terminal"
					required
				/>
			</label>

			<!-- Slug (only for create) -->
			{#if !editingSubtype}
				<label class="form-label">
					Slug <span class="text-red-500">*</span>
					<input
						type="text"
						name="slug"
						class="form-input"
						bind:value={slugInput}
						placeholder="e.g. cash, check, external-tpe"
						pattern="[a-z0-9-]+"
						title="Lowercase letters, numbers, and hyphens only"
						required
					/>
					<p class="text-xs text-gray-500 mt-1">
						Unique identifier (lowercase, alphanumeric, hyphens). Cannot be changed after creation.
					</p>
				</label>
			{:else}
				<div class="form-label">
					Slug: <code class="bg-gray-200 px-2 py-1 rounded">{editingSubtype.slug}</code>
					<p class="text-xs text-gray-500">Cannot be changed</p>
				</div>
			{/if}

			<!-- Description -->
			<label class="form-label">
				Description (optional)
				<textarea
					name="description"
					class="form-input"
					rows="2"
					placeholder="Optional description for admin reference"
					>{editingSubtype?.description || ''}</textarea
				>
			</label>

			<!-- Tap-to-pay Configuration -->
			<hr class="my-2" />
			<h4 class="text-lg font-semibold">Tap-to-pay Configuration (optional)</h4>
			<p class="text-sm text-gray-600">
				Configure automatic payment reconciliation via external POS terminals (Stripe Terminal,
				SumUp, etc.)
			</p>

			<label class="form-label">
				Tap-to-pay Processor
				<select
					name="tapToPayProcessor"
					class="form-input"
					bind:value={selectedProcessor}
					on:change={() => {
						if (!selectedProcessor) {
							urlInput = '';
						}
					}}
				>
					<option value="">Not used</option>
					{#each data.availableProcessors as proc}
						<option value={proc.processor} disabled={!proc.available}>
							{proc.displayName}
							{#if !proc.available}(not configured){/if}
						</option>
					{/each}
				</select>
				<p class="text-xs text-gray-500 mt-1">
					Select a payment processor for automatic reconciliation. Configure processors in Payment
					Settings.
				</p>
			</label>

			<label class="form-label">
				Tap-to-pay URL (optional)
				<input
					type="url"
					name="tapToPayUrl"
					class="form-input"
					bind:value={urlInput}
					placeholder="e.g. https://open.paynow-app.com"
					disabled={tapToPayUrlDisabled}
				/>
				<p class="text-xs text-gray-500 mt-1">
					Deep link to open the payment terminal app (e.g. Paynow for Stripe)
				</p>
			</label>

			<!-- Disabled checkbox (only for edit) -->
			{#if editingSubtype && editingSubtype.slug !== 'cash'}
				<label class="checkbox-label flex items-center gap-2">
					<input
						type="checkbox"
						name="disabled"
						class="form-checkbox"
						value="true"
						checked={editingSubtype.disabled}
					/>
					<span>Disable this subtype (hide from selection)</span>
				</label>
			{/if}

			<!-- Action Buttons -->
			<div class="flex gap-2 mt-4">
				<button type="submit" class="btn btn-black">
					{editingSubtype ? 'Update' : 'Create'}
				</button>

				<button type="button" class="btn" on:click={resetForm}> Cancel </button>
			</div>
		</form>
	{/if}
</div>
