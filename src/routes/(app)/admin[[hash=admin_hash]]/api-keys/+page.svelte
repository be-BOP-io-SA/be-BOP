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

	<section class="rounded-lg border border-gray-200 p-5 flex flex-col gap-3">
		<h2 class="text-xl">{t('admin.apiKeys.logTitle')}</h2>
		<p class="text-sm opacity-80">{t('admin.apiKeys.logHelp')}</p>

		<form method="get" class="flex flex-wrap items-end gap-3">
			<label class="form-label">
				{t('admin.apiKeys.logFilterKey')}
				<select name="logKey" class="form-input w-auto">
					<option value="">{t('admin.apiKeys.logFilterAllKeys')}</option>
					{#each data.keys as key}
						<option value={key._id} selected={data.logs.keyId === key._id}>{key.name}</option>
					{/each}
				</select>
			</label>
			<label class="form-label">
				{t('admin.apiKeys.logFilterOutcome')}
				<select name="logOutcome" class="form-input w-auto">
					<option value="all" selected={data.logs.outcome === 'all'}>
						{t('admin.apiKeys.logOutcomeAll')}
					</option>
					<option value="errors" selected={data.logs.outcome === 'errors'}>
						{t('admin.apiKeys.logOutcomeErrors')}
					</option>
				</select>
			</label>
			<input
				type="submit"
				class="btn body-mainCTA w-auto text-base"
				value={t('admin.apiKeys.logFilterApply')}
			/>
		</form>

		{#if data.logs.entries.length === 0}
			<div
				class="rounded-md border border-dashed border-gray-300 px-4 py-8 text-center text-sm opacity-80"
			>
				{t('admin.apiKeys.logEmpty')}
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead>
						<tr class="border-b border-gray-200 opacity-70">
							<th class="py-2 pr-3 font-medium">{t('admin.apiKeys.logWhen')}</th>
							<th class="py-2 pr-3 font-medium">{t('admin.apiKeys.logKey')}</th>
							<th class="py-2 pr-3 font-medium">{t('admin.apiKeys.logCall')}</th>
							<th class="py-2 pr-3 font-medium">{t('admin.apiKeys.logStatus')}</th>
							<th class="py-2 font-medium">{t('admin.apiKeys.logDuration')}</th>
						</tr>
					</thead>
					<tbody>
						{#each data.logs.entries as entry}
							<tr class="border-b border-gray-100 last:border-0 align-top">
								<td class="py-2.5 pr-3 whitespace-nowrap">
									{new Date(entry.createdAt).toLocaleString()}
								</td>
								<td class="py-2.5 pr-3">
									{entry.keyName ?? t('admin.apiKeys.logNoKey')}
									{#if entry.keyPrefix}
										<span class="block font-mono text-xs opacity-70">{entry.keyPrefix}…</span>
									{/if}
								</td>
								<td class="py-2.5 pr-3 font-mono text-xs">
									{entry.method}
									{entry.path}{entry.query ? `?${entry.query}` : ''}
									{#if entry.requestBody || entry.responseBody || entry.stream}
										<details class="mt-1">
											<summary class="cursor-pointer font-sans opacity-80">
												{t('admin.apiKeys.logDetails')}
											</summary>
											{#if entry.stream}
												<p class="mt-1 font-sans opacity-80">{t('admin.apiKeys.logStream')}</p>
											{/if}
											{#if entry.requestBody}
												<p class="mt-2 font-sans opacity-70">{t('admin.apiKeys.logRequest')}</p>
												<pre
													class="whitespace-pre-wrap break-all rounded bg-gray-50 p-2">{entry.requestBody}</pre>
											{/if}
											{#if entry.responseBody}
												<p class="mt-2 font-sans opacity-70">{t('admin.apiKeys.logResponse')}</p>
												<pre
													class="whitespace-pre-wrap break-all rounded bg-gray-50 p-2">{entry.responseBody}</pre>
											{/if}
											{#if entry.truncated}
												<p class="mt-1 font-sans opacity-70">{t('admin.apiKeys.logTruncated')}</p>
											{/if}
										</details>
									{/if}
								</td>
								<td
									class="py-2.5 pr-3 whitespace-nowrap {entry.status >= 400
										? 'text-red-600'
										: 'text-green-700'}"
								>
									{entry.status}
									{#if entry.errorCode}
										<span class="block font-mono text-xs opacity-70">{entry.errorCode}</span>
									{/if}
								</td>
								<td class="py-2.5 whitespace-nowrap opacity-80">{entry.durationMs} ms</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<div class="flex items-center gap-4 text-sm">
				<span class="opacity-70">
					{t('admin.apiKeys.logCount', { count: data.logs.total })}
				</span>
				{#if data.logs.page > 1}
					<a
						class="underline body-hyperlink"
						href="?logKey={data.logs.keyId}&logOutcome={data.logs.outcome}&logPage={data.logs.page -
							1}"
					>
						{t('admin.apiKeys.logPrevious')}
					</a>
				{/if}
				{#if data.logs.page * data.logs.pageSize < data.logs.total}
					<a
						class="underline body-hyperlink"
						href="?logKey={data.logs.keyId}&logOutcome={data.logs.outcome}&logPage={data.logs.page +
							1}"
					>
						{t('admin.apiKeys.logNext')}
					</a>
				{/if}
			</div>
		{/if}
	</section>
</div>
