<script lang="ts">
	import { applyAction, enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { ActionData, PageData } from './$types';
	import { generateId } from '$lib/utils/generateId';
	import IconUpArrow from '~icons/ant-design/arrow-up-outlined';
	import IconDownArrow from '~icons/ant-design/arrow-down-outlined';

	export let data: PageData;
	export let form: ActionData;

	const TYPE_LABELS: Record<string, string> = {
		options: 'Option list',
		free: 'Free input',
		address: 'Address'
	};

	let showCreateForm = false;
	let editingField: (typeof data.fields)[0] | null = null;
	let nameInput = '';
	let slugInput = '';
	let selectedType = '';
	let optionsInput = '';
	let maxLengthInput = '';
	let selectedFormat = '';

	$: if (!editingField && nameInput) {
		slugInput = generateId(nameInput, false);
	}

	let sortedFields = [...data.fields];
	let orderChanged = false;

	$: {
		sortedFields = [...data.fields];
		orderChanged = false;
	}

	function moveUp(index: number) {
		if (index === 0) {
			return;
		}
		const arr = [...sortedFields];
		[arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
		sortedFields = arr;
		orderChanged = true;
	}

	function moveDown(index: number) {
		if (index >= sortedFields.length - 1) {
			return;
		}
		const arr = [...sortedFields];
		[arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
		sortedFields = arr;
		orderChanged = true;
	}

	function startEdit(field: (typeof data.fields)[0]) {
		editingField = field;
		showCreateForm = false;
		nameInput = field.name;
		selectedType = field.type;
		optionsInput = field.options?.join('\n') ?? '';
		maxLengthInput = field.free?.maxLength ? String(field.free.maxLength) : '';
		selectedFormat = field.free?.format ?? '';
	}

	function resetForm() {
		showCreateForm = false;
		editingField = null;
		nameInput = '';
		slugInput = '';
		selectedType = '';
		optionsInput = '';
		maxLengthInput = '';
		selectedFormat = '';
	}
</script>

<h1 class="text-3xl mb-4">Custom input for order processing</h1>

<p class="text-gray-600 mb-6">
	Define custom input fields shown to customers on the checkout page. Collected values are stored on
	the order and visible on the order page.
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
	<section>
		<h2 class="text-2xl mb-4">Existing Inputs</h2>

		{#if sortedFields.length === 0}
			<p class="text-gray-500">No custom inputs configured yet. Create your first one below!</p>
		{:else}
			<div class="flex flex-col gap-4">
				{#each sortedFields as field, i (field._id)}
					<div
						class="border rounded-lg p-4 flex justify-between items-start {field.disabled
							? 'bg-gray-50 opacity-60'
							: ''}"
					>
						<div class="flex-1">
							<div class="flex items-center gap-2">
								<h3 class="font-bold text-lg">{field.name}</h3>
								<span class="text-xs bg-blue-600 text-white px-2 py-1 rounded"
									>{TYPE_LABELS[field.type] ?? field.type}</span
								>
								{#if field.required}
									<span class="text-xs bg-amber-600 text-white px-2 py-1 rounded">Mandatory</span>
								{/if}
								{#if field.disabled}
									<span class="text-xs bg-gray-500 text-white px-2 py-1 rounded">Disabled</span>
								{/if}
							</div>
							<p class="text-sm text-gray-600">
								Slug: <code class="bg-gray-100 px-1 rounded">{field.slug}</code>
							</p>
							<p class="text-sm mt-2">{field.label}</p>
							{#if field.type === 'options' && field.options?.length}
								<p class="text-sm text-gray-600 mt-1">Options: {field.options.join(', ')}</p>
							{/if}
							{#if field.type === 'free' && field.free}
								<p class="text-sm text-gray-600 mt-1">
									{#if field.free.maxLength}Max length: {field.free.maxLength}.{/if}
									{#if field.free.format}Format: {field.free.format}.{/if}
								</p>
							{/if}
						</div>

						<div class="flex flex-col gap-2 ml-4">
							<div class="flex gap-2">
								<button type="button" class="btn btn-sm" on:click={() => startEdit(field)}>
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
									<input type="hidden" name="id" value={field._id} />
									<button
										type="submit"
										class="btn btn-sm btn-danger"
										on:click={(e) => {
											if (!confirm(`Delete "${field.name}"?\n\nThis action cannot be undone.`)) {
												e.preventDefault();
											}
										}}
									>
										Delete
									</button>
								</form>
							</div>

							<div class="flex gap-2 justify-center">
								<button
									type="button"
									class="btn btn-sm"
									class:invisible={i === 0}
									title="Move up"
									on:click={() => moveUp(i)}
								>
									<IconUpArrow />
								</button>
								<button
									type="button"
									class="btn btn-sm"
									class:invisible={i === sortedFields.length - 1}
									title="Move down"
									on:click={() => moveDown(i)}
								>
									<IconDownArrow />
								</button>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</section>

	{#if !showCreateForm && !editingField}
		<div class="flex gap-2 self-start">
			<button type="button" class="btn btn-black" on:click={() => (showCreateForm = true)}>
				+ Create New Input
			</button>
			<form
				method="post"
				action="?/saveSortOrder"
				use:enhance={() => {
					return async ({ result }) => {
						await applyAction(result);
						if (result.type === 'success') {
							await invalidateAll();
						}
					};
				}}
			>
				{#each sortedFields as field}
					<input type="hidden" name="ids" value={field._id} />
				{/each}
				<button type="submit" class="btn btn-black" disabled={!orderChanged}>
					Save sorting order
				</button>
			</form>
		</div>
	{/if}

	{#if showCreateForm || editingField}
		<form
			method="post"
			action="?/{editingField ? 'update' : 'create'}"
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
				{editingField ? `Edit "${editingField.name}"` : 'Create New Input'}
			</h3>

			{#if editingField}
				<input type="hidden" name="id" value={editingField._id} />
				<input type="hidden" name="slug" value={editingField.slug} />
			{/if}

			<label class="form-label">
				Input Name <span class="text-red-500">*</span>
				<input
					type="text"
					name="name"
					class="form-input"
					bind:value={nameInput}
					placeholder="e.g. Gift wrapper"
					required
				/>
			</label>

			{#if !editingField}
				<label class="form-label">
					Slug <span class="text-red-500">*</span>
					<input
						type="text"
						name="slug"
						class="form-input"
						bind:value={slugInput}
						placeholder="e.g. gift-wrapper"
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
					Slug: <code class="bg-gray-200 px-2 py-1 rounded">{editingField.slug}</code>
					<p class="text-xs text-gray-500">Cannot be changed</p>
				</div>
			{/if}

			<label class="form-label">
				Input message <span class="text-red-500">*</span>
				<input
					type="text"
					name="label"
					class="form-input"
					value={editingField?.label ?? ''}
					placeholder="e.g. Choose your gift wrapper:"
					required
				/>
				<p class="text-xs text-gray-500 mt-1">Text shown to the customer on checkout.</p>
			</label>

			<label class="form-label">
				Input type <span class="text-red-500">*</span>
				<select name="type" class="form-input" bind:value={selectedType} required>
					<option value="">--Select an option--</option>
					{#each data.fieldTypes as fieldType}
						<option value={fieldType}>{TYPE_LABELS[fieldType] ?? fieldType}</option>
					{/each}
				</select>
			</label>

			{#if selectedType === 'options'}
				<label class="form-label">
					Options list <span class="text-red-500">*</span>
					<textarea
						name="options"
						class="form-input"
						rows="5"
						placeholder="One option per line"
						bind:value={optionsInput}
					/>
					<p class="text-xs text-gray-500 mt-1">One option per line.</p>
				</label>
			{/if}

			{#if selectedType === 'free'}
				<label class="form-label">
					Max length (optional)
					<input
						type="number"
						name="maxLength"
						class="form-input"
						min="1"
						bind:value={maxLengthInput}
						placeholder="e.g. 100"
					/>
				</label>
				<label class="form-label">
					Format
					<select name="format" class="form-input" bind:value={selectedFormat}>
						<option value="">Text (any)</option>
						{#each data.freeFormats as fmt}
							<option value={fmt}>{fmt}</option>
						{/each}
					</select>
				</label>
			{/if}

			<label class="checkbox-label flex items-center gap-2">
				<input
					type="checkbox"
					name="required"
					class="form-checkbox"
					value="true"
					checked={editingField?.required}
				/>
				<span>Make this input mandatory</span>
			</label>

			<label class="checkbox-label flex items-center gap-2">
				<input
					type="checkbox"
					name="disabled"
					class="form-checkbox"
					value="true"
					checked={editingField?.disabled}
				/>
				<span>Disable this input (hide from selection)</span>
			</label>

			<label class="checkbox-label flex items-center gap-2">
				<input
					type="checkbox"
					name="isPersonalData"
					class="form-checkbox"
					value="true"
					checked={editingField?.isPersonalData}
				/>
				<span>Contains personal data (subject to GDPR auto-cleanup)</span>
			</label>

			<div class="flex gap-2 mt-4">
				<button type="submit" class="btn btn-black">
					{editingField ? 'Update' : 'Create'}
				</button>

				<button type="button" class="btn" on:click={resetForm}> Cancel </button>
			</div>
		</form>
	{/if}
</div>
