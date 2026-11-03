<script lang="ts">
	import { applyAction, enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { ActionData, PageData } from './$types';
	import { generateId } from '$lib/utils/generateId';
	import IconUpArrow from '~icons/ant-design/arrow-up-outlined';
	import IconDownArrow from '~icons/ant-design/arrow-down-outlined';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

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

	let sortedSubtypes = [...data.subtypes];
	let orderChanged = false;

	$: {
		sortedSubtypes = [...data.subtypes];
		orderChanged = false;
	}

	function moveUp(index: number) {
		if (index === 0) {
			return;
		}
		const arr = [...sortedSubtypes];
		[arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
		sortedSubtypes = arr;
		orderChanged = true;
	}

	function moveDown(index: number) {
		if (index >= sortedSubtypes.length - 1) {
			return;
		}
		const arr = [...sortedSubtypes];
		[arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
		sortedSubtypes = arr;
		orderChanged = true;
	}

	function resetForm() {
		showCreateForm = false;
		editingSubtype = null;
		nameInput = '';
		slugInput = '';
		selectedProcessor = '';
		urlInput = '';
	}
</script>

<h1 class="text-3xl mb-4">{t('admin.posPayments.title')}</h1>

<p class="text-gray-600 mb-6">
	{t('admin.posPayments.description')}
</p>

{#if form?.error}
	<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
		{form.error}
	</div>
{/if}

{#if form?.success}
	<div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
		{t('admin.posPayments.operationSuccessful')}
	</div>
{/if}

<div class="flex flex-col gap-6">
	<!-- Existing Subtypes List -->
	<section>
		<h2 class="text-2xl mb-4">{t('admin.posPayments.existingSubtypes')}</h2>

		{#if sortedSubtypes.length === 0}
			<p class="text-gray-500">{t('admin.posPayments.noSubtypes')}</p>
		{:else}
			<div class="flex flex-col gap-4">
				{#each sortedSubtypes as subtype, i (subtype._id)}
					<div
						class="border rounded-lg p-4 flex justify-between items-start {subtype.disabled
							? 'bg-gray-50 opacity-60'
							: ''}"
					>
						<div class="flex-1">
							<div class="flex items-center gap-2">
								<h3 class="font-bold text-lg">{subtype.name}</h3>
								{#if subtype.slug === 'cash'}
									<span class="text-xs bg-blue-600 text-white px-2 py-1 rounded"
										>{t('admin.posPayments.systemBadge')}</span
									>
								{/if}
								{#if subtype.disabled}
									<span class="text-xs bg-gray-500 text-white px-2 py-1 rounded"
										>{t('admin.posPayments.disabledBadge')}</span
									>
								{/if}
							</div>
							<p class="text-sm text-gray-600">
								{t('admin.posPayments.slugPrefix')}
								<code class="bg-gray-100 px-1 rounded">{subtype.slug}</code>
							</p>

							{#if subtype.description}
								<p class="text-sm mt-2">{subtype.description}</p>
							{/if}

							{#if subtype.tapToPay}
								<div class="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
									<p class="text-sm font-semibold text-blue-900">
										{t('admin.posPayments.tapToPayEnabled')}
									</p>
									<p class="text-sm text-blue-800">
										{t('admin.posPayments.processorLabel')}
										<strong>{subtype.tapToPay.processor}</strong>
									</p>
									{#if subtype.tapToPay.onActivationUrl}
										<p class="text-sm text-blue-800">
											{t('admin.posPayments.tapToPayUrlLabel', {
												url: subtype.tapToPay.onActivationUrl
											})}
										</p>
									{/if}
								</div>
							{/if}
						</div>

						<div class="flex flex-col gap-2 ml-4">
							<div class="flex gap-2">
								<button
									type="button"
									class="btn btn-sm"
									on:click={() => {
										editingSubtype = subtype;
										showCreateForm = false;
										nameInput = subtype.name;
										selectedProcessor = subtype.tapToPay?.processor || '';
										urlInput = subtype.tapToPay?.onActivationUrl || '';
									}}
								>
									{t('admin.posPayments.edit')}
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
											if (!confirm(t('admin.posPayments.deleteConfirm', { name: subtype.name }))) {
												e.preventDefault();
											}
										}}
									>
										{t('admin.posPayments.delete')}
									</button>
								</form>
							</div>

							<div class="flex gap-2 justify-center">
								<button
									type="button"
									class="btn btn-sm"
									class:invisible={i === 0}
									title={t('admin.posPayments.moveUp')}
									on:click={() => moveUp(i)}
								>
									<IconUpArrow />
								</button>
								<button
									type="button"
									class="btn btn-sm"
									class:invisible={i === sortedSubtypes.length - 1}
									title={t('admin.posPayments.moveDown')}
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

	<!-- Create/Edit Form Toggle -->
	{#if !showCreateForm && !editingSubtype}
		<div class="flex gap-2 self-start">
			<button type="button" class="btn btn-black" on:click={() => (showCreateForm = true)}>
				{t('admin.posPayments.createNewSubtype')}
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
				{#each sortedSubtypes as subtype}
					<input type="hidden" name="ids" value={subtype._id.toString()} />
				{/each}
				<button type="submit" class="btn btn-black" disabled={!orderChanged}>
					{t('admin.posPayments.saveSortingOrder')}
				</button>
			</form>
		</div>
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
				{editingSubtype
					? t('admin.posPayments.editSubtypeTitle', { name: editingSubtype.name })
					: t('admin.posPayments.createSubtypeTitle')}
			</h3>

			{#if editingSubtype}
				<input type="hidden" name="id" value={editingSubtype._id.toString()} />
			{/if}

			<!-- Display Name -->
			<label class="form-label">
				{t('admin.posPayments.displayNameLabel')} <span class="text-red-500">*</span>
				<input
					type="text"
					name="name"
					class="form-input"
					bind:value={nameInput}
					placeholder={t('admin.posPayments.namePlaceholder')}
					required
					disabled={editingSubtype?.slug === 'cash'}
				/>
			</label>

			<!-- Slug (only for create) -->
			{#if !editingSubtype}
				<label class="form-label">
					{t('admin.posPayments.slugFieldLabel')} <span class="text-red-500">*</span>
					<input
						type="text"
						name="slug"
						class="form-input"
						bind:value={slugInput}
						placeholder={t('admin.posPayments.slugPlaceholder')}
						pattern="[a-z0-9-]+"
						title={t('admin.posPayments.slugPatternTitle')}
						required
					/>
					<p class="text-xs text-gray-500 mt-1">
						{t('admin.posPayments.slugHelp')}
					</p>
				</label>
			{:else}
				<div class="form-label">
					{t('admin.posPayments.slugPrefix')}
					<code class="bg-gray-200 px-2 py-1 rounded">{editingSubtype.slug}</code>
					<p class="text-xs text-gray-500">{t('admin.posPayments.slugCannotChange')}</p>
				</div>
			{/if}

			<!-- Description -->
			<label class="form-label">
				{t('admin.posPayments.descriptionLabel')}
				<textarea
					name="description"
					class="form-input"
					rows="2"
					placeholder={t('admin.posPayments.descriptionPlaceholder')}
					disabled={editingSubtype?.slug === 'cash'}>{editingSubtype?.description || ''}</textarea
				>
			</label>

			<!-- Tap-to-pay Configuration -->
			<hr class="my-2" />
			<h4 class="text-lg font-semibold">{t('admin.posPayments.tapToPayConfigTitle')}</h4>
			<p class="text-sm text-gray-600">
				{t('admin.posPayments.tapToPayConfigDescription')}
			</p>

			<label class="form-label">
				{t('admin.posPayments.tapToPayProcessorLabel')}
				<select
					name="tapToPayProcessor"
					class="form-input"
					bind:value={selectedProcessor}
					on:change={() => {
						if (!selectedProcessor) {
							urlInput = '';
						}
					}}
					disabled={editingSubtype?.slug === 'cash'}
				>
					<option value="">{t('admin.posPayments.notUsed')}</option>
					{#each data.availableProcessors as proc}
						<option value={proc.processor} disabled={!proc.available}>
							{proc.displayName}
							{#if !proc.available}{t('admin.posPayments.notConfigured')}{/if}
						</option>
					{/each}
				</select>
				<p class="text-xs text-gray-500 mt-1">
					{t('admin.posPayments.tapToPayProcessorHelp')}
				</p>
			</label>

			<label class="form-label">
				{t('admin.posPayments.tapToPayUrlFieldLabel')}
				<input
					type="url"
					name="tapToPayUrl"
					class="form-input"
					bind:value={urlInput}
					placeholder={t('admin.posPayments.tapToPayUrlPlaceholder')}
					disabled={tapToPayUrlDisabled || editingSubtype?.slug === 'cash'}
				/>
				<p class="text-xs text-gray-500 mt-1">
					{t('admin.posPayments.tapToPayUrlHelp')}
				</p>
			</label>

			<!-- Payment Detail Required checkbox (only for edit) -->
			{#if editingSubtype}
				<label class="checkbox-label flex items-center gap-2">
					<input
						type="checkbox"
						name="paymentDetailRequired"
						class="form-checkbox"
						value="true"
						checked={editingSubtype.paymentDetailRequired}
					/>
					<span>{t('admin.posPayments.paymentDetailRequiredLabel')}</span>
				</label>
			{/if}

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
					<span>{t('admin.posPayments.disableSubtypeLabel')}</span>
				</label>
			{/if}

			<!-- Action Buttons -->
			<div class="flex gap-2 mt-4">
				<button type="submit" class="btn btn-black">
					{editingSubtype ? t('admin.action.update') : t('admin.posPayments.create')}
				</button>

				<button type="button" class="btn" on:click={resetForm}>
					{t('admin.posPayments.cancel')}
				</button>
			</div>
		</form>
	{/if}
</div>
