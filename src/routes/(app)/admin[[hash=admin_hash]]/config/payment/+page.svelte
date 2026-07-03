<script lang="ts">
	import { useI18n } from '$lib/i18n';

	export let data;
	export let form;

	const { t } = useI18n();

	// Local editable copy; each row keeps its stable id (empty for new rows → minted on save).
	let methods = data.customPaymentMethods.map((m) => ({ ...m }));

	function addMethod() {
		methods = [...methods, { id: '', label: '', instructions: '' }];
	}

	function removeMethod(index: number) {
		methods = methods.filter((_, i) => i !== index);
	}
</script>

<h1 class="text-3xl">{t('customPaymentMethod.title')}</h1>

{#if form?.success}
	<div class="alert alert-success">{t('customPaymentMethod.saved')}</div>
{/if}

<form method="post" class="flex flex-col gap-4 mt-4">
	<p class="text-sm">{t('customPaymentMethod.help')}</p>

	{#each methods as method, i (i)}
		<fieldset class="border border-gray-300 rounded-xl p-4 flex flex-col gap-2">
			<input type="hidden" name="customPaymentMethods[{i}].id" value={method.id} />

			<label class="form-label">
				{t('customPaymentMethod.label')}
				<input
					type="text"
					name="customPaymentMethods[{i}].label"
					class="form-input"
					bind:value={method.label}
					placeholder={t('customPaymentMethod.labelPlaceholder')}
				/>
			</label>

			<label class="form-label">
				{t('customPaymentMethod.instructions')}
				<textarea
					name="customPaymentMethods[{i}].instructions"
					class="form-input"
					rows="4"
					bind:value={method.instructions}
					placeholder={t('customPaymentMethod.instructionsPlaceholder')}
				/>
			</label>

			<button type="button" class="btn btn-red self-start" on:click={() => removeMethod(i)}>
				{t('customPaymentMethod.remove')}
			</button>
		</fieldset>
	{/each}

	<button type="button" class="btn body-secondaryCTA self-start" on:click={addMethod}>
		{t('customPaymentMethod.add')}
	</button>

	<button type="submit" class="btn body-mainCTA self-start">{t('customPaymentMethod.save')}</button>
</form>
