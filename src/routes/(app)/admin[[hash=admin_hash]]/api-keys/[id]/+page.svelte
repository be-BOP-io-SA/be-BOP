<script lang="ts">
	import { useI18n } from '$lib/i18n.js';

	export let data;
	export let form;
	const { t } = useI18n();

	function confirmRevoke(event: Event) {
		if (!confirm(t('admin.apiKeys.revokeConfirm'))) {
			event.preventDefault();
		}
	}

	function fmt(d: string | Date | null) {
		if (!d) {
			return '—';
		}
		return new Date(d).toLocaleString();
	}
</script>

<a href="{data.adminPrefix}/api-keys" class="underline block mb-4"
	>{t('admin.apiKeys.backToList')}</a
>

<h1 class="text-3xl">{data.key.name}</h1>

<dl class="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 max-w-2xl">
	<dt class="opacity-70">{t('admin.apiKeys.prefix')}</dt>
	<dd class="font-mono">{data.key.keyPrefix}…</dd>

	<dt class="opacity-70">{t('admin.apiKeys.environment')}</dt>
	<dd>
		<span
			class="text-xs px-2 py-0.5 rounded border {data.key.environment === 'live'
				? 'bg-emerald-50 text-emerald-900 border-emerald-300'
				: 'bg-slate-100 text-slate-800 border-slate-300'}"
		>
			{data.key.environment === 'live'
				? t('admin.apiKeys.environmentBadgeLive')
				: t('admin.apiKeys.environmentBadgeTest')}
		</span>
		<span class="text-sm opacity-70 ml-2">{t('admin.apiKeys.environmentHelp')}</span>
	</dd>

	<dt class="opacity-70">{t('admin.apiKeys.scopes')}</dt>
	<dd class="font-mono">{data.key.scopes.join(', ')}</dd>

	<dt class="opacity-70">{t('admin.apiKeys.status')}</dt>
	<dd>
		{#if data.key.revokedAt}
			<span class="text-red-600">{t('admin.apiKeys.statusRevoked')}</span>
		{:else if data.key.expiresAt && new Date(data.key.expiresAt) <= new Date()}
			<span class="text-orange-600">{t('admin.apiKeys.statusExpired')}</span>
		{:else}
			<span class="text-green-700">{t('admin.apiKeys.statusActive')}</span>
		{/if}
	</dd>

	<dt class="opacity-70">{t('admin.apiKeys.createdAt')}</dt>
	<dd>{fmt(data.key.createdAt)}</dd>

	<dt class="opacity-70">{t('admin.apiKeys.expiresAt')}</dt>
	<dd>{fmt(data.key.expiresAt)}</dd>

	<dt class="opacity-70">{t('admin.apiKeys.revokedAt')}</dt>
	<dd>{fmt(data.key.revokedAt)}</dd>

	<dt class="opacity-70">{t('admin.apiKeys.lastUsedAt')}</dt>
	<dd>{fmt(data.key.lastUsedAt)}</dd>

	<dt class="opacity-70">{t('admin.apiKeys.createdBy')}</dt>
	<dd class="font-mono text-sm">{data.key.createdBy ?? '—'}</dd>
</dl>

{#if form?.alreadyRevoked}
	<p class="mt-4 text-sm text-orange-600">{t('admin.apiKeys.statusRevoked')}</p>
{/if}

{#if !data.key.revokedAt}
	<form method="post" action="?/revoke" class="mt-6">
		<input
			type="submit"
			class="btn btn-red text-white"
			value={t('admin.apiKeys.revoke')}
			on:click={confirmRevoke}
		/>
	</form>
{/if}
