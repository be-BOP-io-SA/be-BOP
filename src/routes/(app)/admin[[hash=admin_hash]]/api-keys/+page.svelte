<script lang="ts">
	import { useI18n } from '$lib/i18n.js';

	export let data;
	export let form;
	const { t } = useI18n();
</script>

<h1 class="text-3xl">{t('admin.apiKeys.listTitle')}</h1>

<section class="mt-6 mb-8 p-4 border rounded flex flex-col gap-3 max-w-2xl">
	<h2 class="text-xl">{t('admin.apiKeys.corsTitle')}</h2>
	<p class="text-sm opacity-80">{t('admin.apiKeys.corsHelp')}</p>
	{#if form?.corsSuccess}
		<div class="alert alert-success">{t('admin.apiKeys.corsSaved')}</div>
	{/if}
	<form method="post" action="?/updateCors" class="flex flex-col gap-3">
		<label class="form-label">
			{t('admin.apiKeys.corsOriginsLabel')}
			<textarea
				name="corsOrigins"
				class="form-input font-mono text-sm min-h-[6rem]"
				rows="4"
				placeholder="https://partner.example&#10;https://pos.example">{data.corsOrigins}</textarea
			>
		</label>
		<p class="text-xs opacity-70">{t('admin.apiKeys.corsOriginsHint')}</p>
		<input type="submit" class="btn body-mainCTA self-start" value={t('admin.apiKeys.corsSave')} />
	</form>
</section>

<a href="{data.adminPrefix}/api-keys/new" class="btn btn-blue text-white inline-block mb-4">
	{t('admin.apiKeys.add')}
</a>

<ul class="mt-4 flex flex-col gap-2">
	{#each data.keys as key}
		<li class="flex flex-wrap gap-2 items-baseline">
			<a href="{data.adminPrefix}/api-keys/{key._id}" class="underline body-hyperlink">
				{key.name}
			</a>
			<span class="text-sm opacity-70 font-mono">{key.keyPrefix}…</span>
			<span
				class="text-xs px-2 py-0.5 rounded border {key.environment === 'live'
					? 'bg-emerald-50 text-emerald-900 border-emerald-300'
					: 'bg-slate-100 text-slate-800 border-slate-300'}"
				title={t('admin.apiKeys.environmentHelp')}
			>
				{key.environment === 'live'
					? t('admin.apiKeys.environmentBadgeLive')
					: t('admin.apiKeys.environmentBadgeTest')}
			</span>
			{#if key.revokedAt}
				<span class="text-sm text-red-600">{t('admin.apiKeys.statusRevoked')}</span>
			{:else if key.expiresAt && new Date(key.expiresAt) <= new Date()}
				<span class="text-sm text-orange-600">{t('admin.apiKeys.statusExpired')}</span>
			{:else}
				<span class="text-sm text-green-700">{t('admin.apiKeys.statusActive')}</span>
			{/if}
			<span class="text-sm opacity-70">{key.scopes.join(', ')}</span>
		</li>
	{:else}
		<li>{t('admin.apiKeys.empty')}</li>
	{/each}
</ul>
