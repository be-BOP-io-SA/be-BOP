<script lang="ts">
	import { applyAction, enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { ActionData, PageData } from './$types';
	import { generateId } from '$lib/utils/generateId';
	import IconUpArrow from '~icons/ant-design/arrow-up-outlined';
	import IconDownArrow from '~icons/ant-design/arrow-down-outlined';
	import { useI18n } from '$lib/i18n.js';

	export let data: PageData;
	export let form: ActionData;

	const { t } = useI18n();

	let TYPE_LABELS: Record<string, string> = {};
	$: TYPE_LABELS = {
		options: t('admin.config.checkoutFieldTypeOptions'),
		free: t('admin.config.checkoutFieldTypeFree'),
		address: t('admin.config.checkoutFieldTypeAddress')
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

<h1 class="text-3xl mb-4">{t('admin.config.checkoutFieldsTitle')}</h1>

<p class="text-gray-600 mb-6">
	{t('admin.config.checkoutFieldsDescription')}
</p>

{#if form?.error}
	<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
		{form.error}
	</div>
{/if}

{#if form?.success}
	<div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
		{t('admin.config.checkoutFieldsOperationSuccess')}
	</div>
{/if}

<div class="flex flex-col gap-6">
	<section>
		<h2 class="text-2xl mb-4">{t('admin.config.checkoutFieldsExisting')}</h2>

		{#if sortedFields.length === 0}
			<p class="text-gray-500">{t('admin.config.checkoutFieldsEmpty')}</p>
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
									<span class="text-xs bg-amber-600 text-white px-2 py-1 rounded"
										>{t('admin.config.checkoutFieldMandatoryBadge')}</span
									>
								{/if}
								{#if field.disabled}
									<span class="text-xs bg-gray-500 text-white px-2 py-1 rounded"
										>{t('admin.config.checkoutFieldDisabledBadge')}</span
									>
								{/if}
							</div>
							<p class="text-sm text-gray-600">
								{t('admin.config.checkoutFieldSlugPrefix')}
								<code class="bg-gray-100 px-1 rounded">{field.slug}</code>
							</p>
							<p class="text-sm mt-2">{field.label}</p>
							{#if field.type === 'options' && field.options?.length}
								<p class="text-sm text-gray-600 mt-1">
									{t('admin.config.checkoutFieldOptionsList', {
										options: field.options.join(', ')
									})}
								</p>
							{/if}
							{#if field.type === 'free' && field.free}
								<p class="text-sm text-gray-600 mt-1">
									{#if field.free.maxLength}{t('admin.config.checkoutFieldMaxLengthInfo', {
											maxLength: field.free.maxLength
										})}{/if}
									{#if field.free.format}{t('admin.config.checkoutFieldFormatInfo', {
											format: field.free.format
										})}{/if}
								</p>
							{/if}
						</div>

						<div class="flex flex-col gap-2 ml-4">
							<div class="flex gap-2">
								<button type="button" class="btn btn-sm" on:click={() => startEdit(field)}>
									{t('admin.config.checkoutFieldEdit')}
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
											if (
												!confirm(t('admin.config.checkoutFieldDeleteConfirm', { name: field.name }))
											) {
												e.preventDefault();
											}
										}}
									>
										{t('admin.config.delete')}
									</button>
								</form>
							</div>

							<div class="flex gap-2 justify-center">
								<button
									type="button"
									class="btn btn-sm"
									class:invisible={i === 0}
									title={t('admin.config.moveUp')}
									on:click={() => moveUp(i)}
								>
									<IconUpArrow />
								</button>
								<button
									type="button"
									class="btn btn-sm"
									class:invisible={i === sortedFields.length - 1}
									title={t('admin.config.moveDown')}
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
				+ {t('admin.config.checkoutFieldsCreateNew')}
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
					{t('admin.config.checkoutFieldsSaveSortOrder')}
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
				{editingField
					? t('admin.config.checkoutFieldEditTitle', { name: editingField.name })
					: t('admin.config.checkoutFieldsCreateNew')}
			</h3>

			{#if editingField}
				<input type="hidden" name="id" value={editingField._id} />
				<input type="hidden" name="slug" value={editingField.slug} />
			{/if}

			<label class="form-label">
				{t('admin.config.checkoutFieldNameLabel')} <span class="text-red-500">*</span>
				<input
					type="text"
					name="name"
					class="form-input"
					bind:value={nameInput}
					placeholder={t('admin.config.checkoutFieldNamePlaceholder')}
					required
				/>
			</label>

			{#if !editingField}
				<label class="form-label">
					{t('admin.config.checkoutFieldSlugFieldLabel')} <span class="text-red-500">*</span>
					<input
						type="text"
						name="slug"
						class="form-input"
						bind:value={slugInput}
						placeholder={t('admin.config.checkoutFieldSlugPlaceholder')}
						pattern="[a-z0-9-]+"
						title={t('admin.config.checkoutFieldSlugPatternTitle')}
						required
					/>
					<p class="text-xs text-gray-500 mt-1">
						{t('admin.config.checkoutFieldSlugHint')}
					</p>
				</label>
			{:else}
				<div class="form-label">
					{t('admin.config.checkoutFieldSlugPrefix')}
					<code class="bg-gray-200 px-2 py-1 rounded">{editingField.slug}</code>
					<p class="text-xs text-gray-500">{t('admin.config.checkoutFieldSlugImmutable')}</p>
				</div>
			{/if}

			<label class="form-label">
				{t('admin.config.checkoutFieldMessageLabel')} <span class="text-red-500">*</span>
				<input
					type="text"
					name="label"
					class="form-input"
					value={editingField?.label ?? ''}
					placeholder={t('admin.config.checkoutFieldMessagePlaceholder')}
					required
				/>
				<p class="text-xs text-gray-500 mt-1">{t('admin.config.checkoutFieldMessageHint')}</p>
			</label>

			<label class="form-label">
				{t('admin.config.checkoutFieldTypeSelectLabel')} <span class="text-red-500">*</span>
				<select name="type" class="form-input" bind:value={selectedType} required>
					<option value="">{t('admin.config.checkoutFieldSelectPlaceholder')}</option>
					{#each data.fieldTypes as fieldType}
						<option value={fieldType}>{TYPE_LABELS[fieldType] ?? fieldType}</option>
					{/each}
				</select>
			</label>

			{#if selectedType === 'options'}
				<label class="form-label">
					{t('admin.config.checkoutFieldOptionsLabel')} <span class="text-red-500">*</span>
					<textarea
						name="options"
						class="form-input"
						rows="5"
						placeholder={t('admin.config.checkoutFieldOptionsPlaceholder')}
						bind:value={optionsInput}
					/>
					<p class="text-xs text-gray-500 mt-1">{t('admin.config.checkoutFieldOptionsHint')}</p>
				</label>
			{/if}

			{#if selectedType === 'free'}
				<label class="form-label">
					{t('admin.config.checkoutFieldMaxLengthLabel')}
					<input
						type="number"
						name="maxLength"
						class="form-input"
						min="1"
						bind:value={maxLengthInput}
						placeholder={t('admin.config.checkoutFieldMaxLengthPlaceholder')}
					/>
				</label>
				<label class="form-label">
					{t('admin.config.checkoutFieldFormatLabel')}
					<select name="format" class="form-input" bind:value={selectedFormat}>
						<option value="">{t('admin.config.checkoutFieldFormatTextAny')}</option>
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
				<span>{t('admin.config.checkoutFieldMandatoryCheckbox')}</span>
			</label>

			<label class="checkbox-label flex items-center gap-2">
				<input
					type="checkbox"
					name="disabled"
					class="form-checkbox"
					value="true"
					checked={editingField?.disabled}
				/>
				<span>{t('admin.config.checkoutFieldDisableCheckbox')}</span>
			</label>

			<label class="checkbox-label flex items-center gap-2">
				<input
					type="checkbox"
					name="isPersonalData"
					class="form-checkbox"
					value="true"
					checked={editingField?.isPersonalData}
				/>
				<span>{t('admin.config.checkoutFieldPersonalDataCheckbox')}</span>
			</label>

			<div class="flex gap-2 mt-4">
				<button type="submit" class="btn btn-black">
					{editingField ? t('admin.action.update') : t('admin.config.checkoutFieldCreateButton')}
				</button>

				<button type="button" class="btn" on:click={resetForm}>
					{t('admin.config.checkoutFieldCancelButton')}
				</button>
			</div>
		</form>
	{/if}
</div>
