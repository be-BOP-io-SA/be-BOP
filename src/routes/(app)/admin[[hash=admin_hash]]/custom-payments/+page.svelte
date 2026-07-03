<script lang="ts">
	import { useI18n } from '$lib/i18n';
	import IconTrash from '$lib/components/icons/IconTrash.svelte';
	import IconUpArrow from '~icons/ant-design/arrow-up-outlined';
	import IconDownArrow from '~icons/ant-design/arrow-down-outlined';

	export let data;
	export let form;

	const { t } = useI18n();

	// Local editable copy; each row keeps its stable id (empty for new rows → minted on save) and a
	// local key so add/remove/reorder don't confuse Svelte's keyed each.
	let nextKey = 0;
	let methods = data.customPaymentMethods.map((m) => ({ ...m, _key: nextKey++ }));

	// _key of the row currently asking for delete confirmation, or null.
	let confirmingKey: number | null = null;

	function addMethod() {
		methods = [...methods, { id: '', label: '', instructions: '', _key: nextKey++ }];
	}

	function removeMethod(index: number) {
		methods = methods.filter((_, i) => i !== index);
		confirmingKey = null;
	}

	function move(index: number, delta: number) {
		const target = index + delta;
		if (target < 0 || target >= methods.length) {
			return;
		}
		const next = [...methods];
		[next[index], next[target]] = [next[target], next[index]];
		methods = next;
	}
</script>

<h1 class="text-3xl">{t('customPaymentMethod.title')}</h1>
<p class="text-sm text-gray-600 mt-2 max-w-3xl">{t('customPaymentMethod.help')}</p>

{#if form?.success}
	<div class="alert alert-success mt-4">{t('customPaymentMethod.saved')}</div>
{/if}
{#if form?.error === 'labelRequired'}
	<div class="alert-error mt-4">{t('customPaymentMethod.errorLabelRequired')}</div>
{/if}

<form method="post" class="flex flex-col gap-4 mt-6">
	<!-- Submit the whole list as one JSON field: robust to add/remove/reorder (no index-named
	     fields that can go stale on a keyed each). -->
	<input
		type="hidden"
		name="methods"
		value={JSON.stringify(
			methods.map((m) => ({ id: m.id, label: m.label, instructions: m.instructions }))
		)}
	/>

	{#if methods.length === 0}
		<p class="text-gray-500 italic border border-dashed border-gray-300 rounded-lg p-6 text-center">
			{t('customPaymentMethod.empty')}
		</p>
	{/if}

	{#each methods as method, i (method._key)}
		<fieldset class="bg-white border border-gray-200 rounded-lg shadow-sm p-4 space-y-3">
			<div class="flex items-center gap-2">
				<span class="text-lg font-medium text-gray-900 grow truncate">
					{method.label || t('customPaymentMethod.untitled', { number: (i + 1).toString() })}
				</span>
				{#if confirmingKey === method._key}
					<span class="text-sm text-gray-600">{t('customPaymentMethod.removeConfirm')}</span>
					<button type="button" class="btn btn-red btn-sm" on:click={() => removeMethod(i)}>
						{t('customPaymentMethod.remove')}
					</button>
					<button
						type="button"
						class="btn body-secondaryCTA btn-sm"
						on:click={() => (confirmingKey = null)}
					>
						{t('customPaymentMethod.cancel')}
					</button>
				{:else}
					<button
						type="button"
						class="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
						title={t('customPaymentMethod.moveUp')}
						disabled={i === 0}
						on:click={() => move(i, -1)}
					>
						<IconUpArrow />
					</button>
					<button
						type="button"
						class="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
						title={t('customPaymentMethod.moveDown')}
						disabled={i === methods.length - 1}
						on:click={() => move(i, 1)}
					>
						<IconDownArrow />
					</button>
					<button
						type="button"
						class="p-1 text-red-400 hover:text-red-600"
						title={t('customPaymentMethod.remove')}
						on:click={() => (confirmingKey = method._key)}
					>
						<IconTrash />
					</button>
				{/if}
			</div>

			<label class="form-label">
				{t('customPaymentMethod.label')}
				<input
					type="text"
					class="form-input"
					bind:value={method.label}
					placeholder={t('customPaymentMethod.labelPlaceholder')}
				/>
			</label>

			<label class="form-label">
				{t('customPaymentMethod.instructions')}
				<textarea
					class="form-input"
					rows="4"
					bind:value={method.instructions}
					placeholder={t('customPaymentMethod.instructionsPlaceholder')}
				/>
			</label>
		</fieldset>
	{/each}

	<button type="button" class="btn body-secondaryCTA self-start" on:click={addMethod}>
		+ {t('customPaymentMethod.add')}
	</button>

	<div class="border-t border-gray-200 pt-4">
		<button type="submit" class="btn body-mainCTA">{t('customPaymentMethod.save')}</button>
	</div>
</form>
