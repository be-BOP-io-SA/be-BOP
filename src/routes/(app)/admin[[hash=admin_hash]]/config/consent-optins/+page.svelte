<script lang="ts">
	import { applyAction, enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { ActionData, PageData } from './$types';
	import type { SubmitFunction } from '@sveltejs/kit';
	import IconUpArrow from '~icons/ant-design/arrow-up-outlined';
	import IconDownArrow from '~icons/ant-design/arrow-down-outlined';
	import { useI18n } from '$lib/i18n.js';

	export let data: PageData;
	export let form: ActionData;

	const { t } = useI18n();

	let showCreateForm = false;
	let editingOptin: (typeof data.optins)[0] | null = null;

	let sortedOptins = [...data.optins];
	let orderChanged = false;

	$: {
		sortedOptins = [...data.optins];
		orderChanged = false;
	}

	function move(index: number, offset: -1 | 1) {
		const target = index + offset;
		if (target < 0 || target >= sortedOptins.length) {
			return;
		}
		const arr = [...sortedOptins];
		[arr[index], arr[target]] = [arr[target], arr[index]];
		sortedOptins = arr;
		orderChanged = true;
	}

	function resetForm() {
		showCreateForm = false;
		editingOptin = null;
	}

	const reloadOnSuccess: SubmitFunction = () => {
		return async ({ result }) => {
			await applyAction(result);
			if (result.type === 'success') {
				await invalidateAll();
				resetForm();
			}
		};
	};
</script>

<h1 class="text-3xl mb-4">{t('admin.consentOptins.title')}</h1>

<p class="text-gray-600 mb-6">{t('admin.consentOptins.description')}</p>

{#if form?.error}
	<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
		{form.error}
	</div>
{/if}

{#if form?.success}
	<div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
		{t('admin.consentOptins.operationSuccess')}
	</div>
{/if}

<div class="flex flex-col gap-6">
	{#if sortedOptins.length === 0}
		<p class="text-gray-500">{t('admin.consentOptins.empty')}</p>
	{:else}
		<div class="flex flex-col gap-4">
			{#each sortedOptins as optin, i (optin._id)}
				<div
					class="border rounded-lg p-4 flex justify-between items-start {optin.enabled
						? ''
						: 'bg-gray-50 opacity-60'}"
				>
					<div class="flex-1">
						<div class="flex items-center gap-2">
							<p class="font-bold">{optin.label}</p>
							{#if !optin.enabled}
								<span class="text-xs bg-gray-500 text-white px-2 py-1 rounded"
									>{t('admin.consentOptins.disabledBadge')}</span
								>
							{/if}
						</div>
						<a
							href="{data.adminPrefix}/config/consent-optins/{optin._id}/translations"
							class="text-sm underline"
						>
							{t('admin.consentOptins.translations')}
						</a>
					</div>

					<div class="flex flex-col gap-2 ml-4">
						<div class="flex gap-2">
							<button
								type="button"
								class="btn btn-sm"
								on:click={() => {
									editingOptin = optin;
									showCreateForm = false;
								}}
							>
								{t('admin.consentOptins.edit')}
							</button>

							<form method="post" action="?/delete" use:enhance={reloadOnSuccess}>
								<input type="hidden" name="id" value={optin._id} />
								<button
									type="submit"
									class="btn btn-sm btn-danger"
									on:click={(e) => {
										if (!confirm(t('admin.consentOptins.deleteConfirm', { label: optin.label }))) {
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
								on:click={() => move(i, -1)}
							>
								<IconUpArrow />
							</button>
							<button
								type="button"
								class="btn btn-sm"
								class:invisible={i === sortedOptins.length - 1}
								title={t('admin.config.moveDown')}
								on:click={() => move(i, 1)}
							>
								<IconDownArrow />
							</button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	{#if !showCreateForm && !editingOptin}
		<div class="flex gap-2 self-start">
			<button type="button" class="btn btn-black" on:click={() => (showCreateForm = true)}>
				+ {t('admin.consentOptins.createNew')}
			</button>
			<form method="post" action="?/saveSortOrder" use:enhance={reloadOnSuccess}>
				{#each sortedOptins as optin}
					<input type="hidden" name="ids" value={optin._id} />
				{/each}
				<button type="submit" class="btn btn-black" disabled={!orderChanged}>
					{t('admin.consentOptins.saveSortOrder')}
				</button>
			</form>
		</div>
	{/if}

	{#if showCreateForm || editingOptin}
		{#key editingOptin?._id}
			<form
				method="post"
				action="?/{editingOptin ? 'update' : 'create'}"
				class="border rounded-lg p-6 flex flex-col gap-4 bg-gray-50"
				use:enhance={reloadOnSuccess}
			>
				<h3 class="text-xl font-bold">
					{editingOptin
						? t('admin.consentOptins.editTitle', { label: editingOptin.label })
						: t('admin.consentOptins.createNew')}
				</h3>

				{#if editingOptin}
					<input type="hidden" name="id" value={editingOptin._id} />
				{/if}

				<label class="form-label">
					{t('admin.consentOptins.labelField')} <span class="text-red-500">*</span>
					<input
						type="text"
						name="label"
						class="form-input"
						value={editingOptin?.label ?? ''}
						required
					/>
					<p class="text-xs text-gray-500 mt-1">{t('admin.consentOptins.labelHint')}</p>
				</label>

				<label class="checkbox-label flex items-center gap-2">
					<input
						type="checkbox"
						name="enabled"
						class="form-checkbox"
						value="true"
						checked={editingOptin?.enabled ?? false}
					/>
					<span>{t('admin.consentOptins.enabledCheckbox')}</span>
				</label>

				<div class="flex gap-2 mt-4">
					<button type="submit" class="btn btn-black">
						{editingOptin ? t('admin.action.update') : t('admin.consentOptins.createButton')}
					</button>
					<button type="button" class="btn" on:click={resetForm}>
						{t('admin.consentOptins.cancel')}
					</button>
				</div>
			</form>
		{/key}
	{/if}
</div>
