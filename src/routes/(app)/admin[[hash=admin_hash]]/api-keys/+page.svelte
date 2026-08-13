<script lang="ts">
	import { useI18n } from '$lib/i18n.js';

	export let data;
	export let form;
	const { t } = useI18n();

	function statusLabel(key: (typeof data.keys)[number]) {
		if (key.revokedAt) {
			return t('admin.apiKeys.statusRevoked');
		}
		if (key.expiresAt && new Date(key.expiresAt) <= new Date()) {
			return t('admin.apiKeys.statusExpired');
		}
		return t('admin.apiKeys.statusActive');
	}

	function statusClass(key: (typeof data.keys)[number]) {
		if (key.revokedAt) {
			return 'text-red-600';
		}
		if (key.expiresAt && new Date(key.expiresAt) <= new Date()) {
			return 'text-orange-600';
		}
		return 'text-green-700';
	}
</script>

<div class="flex flex-col gap-8 max-w-4xl">
	<header class="flex flex-col gap-2">
		<h1 class="text-3xl">{t('admin.apiKeys.listTitle')}</h1>
		<p class="text-sm opacity-80 max-w-2xl">{t('admin.apiKeys.listIntro')}</p>
	</header>

	<section class="rounded-lg border border-gray-200 p-5 flex flex-col gap-4">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div class="flex flex-col gap-1 min-w-0">
				<h2 class="text-xl">{t('admin.apiKeys.keysSectionTitle')}</h2>
				<p class="text-sm opacity-80">{t('admin.apiKeys.keysSectionHelp')}</p>
			</div>
			<a
				href="{data.adminPrefix}/api-keys/new"
				class="btn btn-blue text-white self-start w-auto shrink-0 text-base"
			>
				{t('admin.apiKeys.add')}
			</a>
		</div>

		{#if data.keys.length === 0}
			<div
				class="rounded-md border border-dashed border-gray-300 px-4 py-8 text-center text-sm opacity-80"
			>
				<p>{t('admin.apiKeys.empty')}</p>
				<p class="mt-1">{t('admin.apiKeys.emptyHint')}</p>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead>
						<tr class="border-b border-gray-200 opacity-70">
							<th class="py-2 pr-3 font-medium">{t('admin.apiKeys.name')}</th>
							<th class="py-2 pr-3 font-medium">{t('admin.apiKeys.prefix')}</th>
							<th class="py-2 pr-3 font-medium">{t('admin.apiKeys.environment')}</th>
							<th class="py-2 pr-3 font-medium">{t('admin.apiKeys.status')}</th>
							<th class="py-2 font-medium">{t('admin.apiKeys.scopes')}</th>
						</tr>
					</thead>
					<tbody>
						{#each data.keys as key}
							<tr class="border-b border-gray-100 last:border-0">
								<td class="py-2.5 pr-3">
									<a
										href="{data.adminPrefix}/api-keys/{key._id}"
										class="underline body-hyperlink font-medium"
									>
										{key.name}
									</a>
								</td>
								<td class="py-2.5 pr-3 font-mono text-xs opacity-80">{key.keyPrefix}…</td>
								<td class="py-2.5 pr-3">
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
								</td>
								<td class="py-2.5 pr-3 {statusClass(key)}">{statusLabel(key)}</td>
								<td class="py-2.5 font-mono text-xs opacity-80">{key.scopes.join(', ')}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>

	<section class="rounded-lg border border-gray-200 p-5 flex flex-col gap-3">
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
					class="form-input font-mono text-sm min-h-[6rem] max-w-xl"
					rows="4"
					placeholder="https://partner.example&#10;https://pos.example">{data.corsOrigins}</textarea
				>
			</label>
			<p class="text-xs opacity-70">{t('admin.apiKeys.corsOriginsHint')}</p>
			<input
				type="submit"
				class="btn body-mainCTA self-start w-auto text-base"
				value={t('admin.apiKeys.corsSave')}
			/>
		</form>
	</section>
</div>
