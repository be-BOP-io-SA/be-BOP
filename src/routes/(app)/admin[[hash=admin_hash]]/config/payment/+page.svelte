<script lang="ts">
	import { useI18n } from '$lib/i18n';

	export let data;
	export let form;

	const { t } = useI18n();
</script>

<h1 class="text-3xl">{t('customPaymentMethod.title')}</h1>

{#if form?.success}
	<div class="alert alert-success">{t('customPaymentMethod.saved')}</div>
{/if}

<form method="post" class="flex flex-col gap-4 mt-4">
	<p class="text-sm">{t('customPaymentMethod.help')}</p>

	<label class="checkbox-label">
		<input
			type="checkbox"
			name="customPaymentMethodEnabled"
			class="form-checkbox"
			checked={data.customPaymentMethod.enabled}
		/>
		{t('customPaymentMethod.enable')}
	</label>

	<label class="form-label">
		{t('customPaymentMethod.label')}
		<input
			type="text"
			name="customPaymentMethodLabel"
			class="form-input"
			value={data.customPaymentMethod.label}
			placeholder={t('customPaymentMethod.labelPlaceholder')}
		/>
	</label>

	<label class="form-label">
		{t('customPaymentMethod.instructions')}
		<textarea
			name="customPaymentMethodInstructions"
			class="form-input"
			rows="4"
			placeholder={t('customPaymentMethod.instructionsPlaceholder')}
			>{data.customPaymentMethod.instructions}</textarea
		>
	</label>

	<button type="submit" class="btn body-mainCTA self-start">{t('customPaymentMethod.save')}</button>
</form>
