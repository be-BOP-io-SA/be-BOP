<script lang="ts">
	import { useI18n } from '$lib/i18n.js';

	export let data;
	const { t } = useI18n();
</script>

<div class="flex flex-col gap-6 max-w-4xl">
	<a href="{data.adminPrefix}/api-keys" class="underline body-hyperlink self-start">
		{t('admin.apiKeys.backToList')}
	</a>

	<header class="flex flex-col gap-2">
		<h1 class="text-3xl">{t('admin.apiKeys.logTitle')}</h1>
		<p class="text-sm opacity-80 max-w-2xl">{t('admin.apiKeys.logHelp')}</p>
	</header>

	<section class="rounded-lg border border-gray-200 p-5 flex flex-col gap-3">
		<form method="get" class="flex flex-wrap items-end gap-3">
			<label class="form-label">
				{t('admin.apiKeys.logFilterKey')}
				<select name="key" class="form-input w-auto">
					<option value="">{t('admin.apiKeys.logFilterAllKeys')}</option>
					{#each data.keys as key}
						<option value={key._id} selected={data.keyId === key._id}>{key.name}</option>
					{/each}
				</select>
			</label>
			<label class="form-label">
				{t('admin.apiKeys.logFilterOutcome')}
				<select name="outcome" class="form-input w-auto">
					<option value="all" selected={data.outcome === 'all'}>
						{t('admin.apiKeys.logOutcomeAll')}
					</option>
					<option value="errors" selected={data.outcome === 'errors'}>
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

		{#if data.entries.length === 0}
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
						{#each data.entries as entry}
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
				{#if data.page > 1}
					<a
						class="underline body-hyperlink"
						href="?key={data.keyId}&outcome={data.outcome}&page={data.page - 1}"
					>
						{t('admin.apiKeys.logPrevious')}
					</a>
				{/if}
				{#if data.hasMore}
					<a
						class="underline body-hyperlink"
						href="?key={data.keyId}&outcome={data.outcome}&page={data.page + 1}"
					>
						{t('admin.apiKeys.logNext')}
					</a>
				{/if}
			</div>
		{/if}
	</section>
</div>
