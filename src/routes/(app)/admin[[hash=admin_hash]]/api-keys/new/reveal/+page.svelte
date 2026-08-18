<script lang="ts">
	import { useI18n } from '$lib/i18n.js';

	export let data;

	const { t } = useI18n();

	let copied = false;

	async function copySecret() {
		if (data.alreadyShown || !data.secret) {
			return;
		}
		try {
			await navigator.clipboard.writeText(data.secret);
			copied = true;
		} catch {
			copied = false;
		}
	}
</script>

<h1 class="text-3xl">{t('admin.apiKeys.revealTitle')}</h1>

{#if data.alreadyShown}
	<div class="mt-4 p-4 border rounded flex flex-col gap-3 max-w-2xl">
		<p>{t('admin.apiKeys.secretAlreadyShown')}</p>
		<a href="{data.adminPrefix}/api-keys" class="btn self-start">{t('admin.apiKeys.backToList')}</a>
	</div>
{:else}
	<div class="mt-4 p-4 border border-amber-400 bg-amber-50 rounded flex flex-col gap-3 max-w-2xl">
		<p class="font-semibold text-amber-900">{t('admin.apiKeys.secretWarning')}</p>
		<p class="text-sm opacity-80">{t('admin.apiKeys.secretStorageNote')}</p>
		{#if data.name}
			<p class="text-sm opacity-80">{data.name}</p>
		{/if}
		<label class="form-label">
			{t('admin.apiKeys.secret')}
			<input
				class="form-input font-mono w-full"
				type="text"
				readonly
				autocomplete="off"
				value={data.secret}
			/>
		</label>
		<p class="text-sm opacity-80 font-mono">{t('admin.apiKeys.prefix')}: {data.prefix}</p>
		<div class="flex flex-wrap gap-2">
			<button type="button" class="btn btn-blue text-white" on:click={copySecret}>
				{copied ? t('admin.apiKeys.copied') : t('admin.apiKeys.copySecret')}
			</button>
			<a href="{data.adminPrefix}/api-keys/{data.id}" class="btn body-mainCTA">
				{t('admin.apiKeys.viewKey')}
			</a>
			<a href="{data.adminPrefix}/api-keys" class="btn">{t('admin.apiKeys.backToList')}</a>
		</div>
	</div>
{/if}
