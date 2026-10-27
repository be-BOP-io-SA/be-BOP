<script lang="ts">
	import { useI18n } from '$lib/i18n';

	export let data;
	export let form;

	const { t } = useI18n();
</script>

<h1 class="text-2xl">{t('admin.seo.title')}</h1>
{#if form?.success}
	<div class="alert alert-success">{form.success}</div>
{/if}
<form method="post" class="flex flex-col gap-4" action="?/update">
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="hideFromSearchEngines"
			class="form-checkbox"
			checked={data.hideFromSearchEngines}
		/>
		{t('admin.seo.hideFromSearchEngines')}
	</label>

	<div class="flex flex-col gap-2">
		<label class="checkbox-label">
			<input
				type="checkbox"
				name="enableBeaconSignal"
				class="form-checkbox"
				checked={data.enableBeaconSignal}
			/>
			{t('telemetry.seo.checkboxLabel')}
		</label>
		<div class="ml-6 p-3 bg-gray-50 border border-gray-200 rounded text-sm text-gray-700">
			{t('telemetry.seo.infoBlock')}
		</div>
	</div>

	<input type="submit" value={t('admin.action.update')} class="btn body-mainCTA self-start" />
</form>
