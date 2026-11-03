<script lang="ts">
	import { useI18n } from '$lib/i18n';

	export let config: { apiKey: string };

	const { t } = useI18n();
</script>

<label class="form-label">
	{t('admin.swissBitcoinPay.apiKey')}
	<input class="form-input" type="password" name="apiKey" value={config.apiKey} required />
</label>
