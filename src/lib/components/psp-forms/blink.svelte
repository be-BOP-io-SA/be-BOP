<script lang="ts">
	import { useI18n } from '$lib/i18n';
	import Trans from '$lib/components/Trans.svelte';

	export let config: { apiKey: string; lnAddress: string; walletId: string };

	const { t } = useI18n();
</script>

<p class="text-sm">
	<Trans key="admin.blink.intro">
		<strong slot="0" let:translation>{translation}</strong>
	</Trans>
</p>

<h2 class="text-2xl">{t('admin.blink.option1Title')}</h2>
<label class="form-label">
	{t('admin.blink.lnAddress')}
	<input
		class="form-input"
		type="text"
		name="lnAddress"
		placeholder="you@blink.sv"
		value={config.lnAddress}
	/>
</label>

<h2 class="text-2xl">{t('admin.blink.option2Title')}</h2>
<label class="form-label">
	{t('admin.blink.apiKey')}
	<input
		class="form-input"
		type="password"
		name="apiKey"
		placeholder="blink_..."
		value={config.apiKey}
	/>
</label>
<label class="form-label">
	{t('admin.blink.walletId')}
	<input class="form-input" type="text" name="walletId" value={config.walletId} />
</label>
