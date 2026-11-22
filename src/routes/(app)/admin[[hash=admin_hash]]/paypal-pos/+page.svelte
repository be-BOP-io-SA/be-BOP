<script lang="ts">
	import { useI18n } from '$lib/i18n';
	import { CURRENCIES } from '$lib/types/Currency';

	export let data;
	export let form;

	const { t } = useI18n();
</script>

<h1 class="text-3xl">{t('admin.paypalPos.title')}</h1>

<p>{t('admin.paypalPos.intro')}</p>

<form method="post" action="?/save" class="flex flex-col gap-4 max-w-xl">
	<label class="form-label">
		Client ID
		<input type="text" name="clientId" class="form-input" value={data.clientId} required />
	</label>
	<label class="form-label">
		Secret
		<input
			type="password"
			name="secret"
			class="form-input"
			autocomplete="off"
			placeholder={data.hasSecret ? t('admin.paypalPos.secretKept') : ''}
			required={!data.hasSecret}
		/>
	</label>
	<label class="checkbox-label">
		<input type="checkbox" name="sandbox" class="form-checkbox" checked={data.sandbox} />
		Sandbox
	</label>
	<label class="form-label">
		{t('admin.paypalPos.currency')}
		<select name="currency" class="form-input" value={data.currency}>
			{#each CURRENCIES as currency}
				<option value={currency}>{currency}</option>
			{/each}
		</select>
	</label>
	{#if form && 'saved' in form}
		<p class="text-green-600">{t('admin.paypalPos.saved')}</p>
	{/if}
	<button type="submit" class="btn btn-black self-start">{t('admin.action.save')}</button>
</form>

{#if data.clientId}
	<form method="post" action="?/reset">
		<button type="submit" class="btn btn-red">{t('admin.paypalPos.reset')}</button>
	</form>
{/if}
