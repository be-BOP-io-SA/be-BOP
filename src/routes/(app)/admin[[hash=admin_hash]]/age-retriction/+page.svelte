<script lang="ts">
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	export let data;
	export let form;
</script>

<h1 class="text-2xl">{t('admin.ageRetriction.title')}</h1>
{#if form?.success}
	<div class="alert alert-success">{form.success}</div>
{/if}
<form method="post" class="flex flex-col gap-4" action="?/update">
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="ageRestrictionEnabled"
			class="form-checkbox"
			checked={data.ageRestriction.enabled}
		/>
		{t('admin.ageRetriction.enableLabel')}
	</label>
	<label class="form-label">
		{t('admin.ageRetriction.legalReason')}
		<input
			type="input"
			name="legalReason"
			class="form-input"
			value={data.ageRestriction.legalReason}
		/>
	</label>
	<input type="submit" value={t('admin.action.update')} class="btn body-mainCTA self-start" />
</form>
