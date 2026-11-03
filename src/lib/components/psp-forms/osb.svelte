<script lang="ts">
	import { useI18n } from '$lib/i18n';

	export let config: { shopId: string; password: string; hmacKey: string };

	const { t } = useI18n();
</script>

<label class="form-label">
	{t('admin.osb.shopId')}
	<input class="form-input" type="text" name="shopId" value={config.shopId} required />
</label>

<label class="form-label">
	{t('admin.osb.restApiPassword')}
	<input class="form-input" type="password" name="password" value={config.password} required />
</label>

<label class="form-label">
	{t('admin.osb.hmacKeyOptional')}
	<input class="form-input" type="password" name="hmacKey" value={config.hmacKey} />
</label>

<p class="text-sm text-gray-500">{t('admin.osb.currencyFixed')}</p>
