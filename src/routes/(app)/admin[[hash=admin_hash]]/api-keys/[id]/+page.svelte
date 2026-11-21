<script lang="ts">
	import { useI18n } from '$lib/i18n.js';
	import { MAX_STREAM_LIFETIME_SECONDS } from '$lib/types/ApiKey';

	export let data;
	export let form;
	const { t } = useI18n();

	function confirmRevoke(event: Event) {
		if (!confirm(t('admin.apiKeys.revokeConfirm'))) {
			event.preventDefault();
		}
	}

	function confirmResetStreams(event: Event) {
		if (!confirm('Hand back every stream place held by this key?')) {
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

<div class="flex flex-col gap-6 max-w-2xl">
	<a href="{data.adminPrefix}/api-keys" class="underline body-hyperlink self-start">
		{t('admin.apiKeys.backToList')}
	</a>

	<header class="flex flex-wrap items-center gap-3">
		<h1 class="text-3xl">{data.key.name}</h1>
		{#if data.key.suspiciousAt}
			<span class="rounded bg-red-100 text-red-700 px-2 py-0.5 text-sm font-medium">
				⚠ {t('admin.apiKeys.suspicious')}
			</span>
		{/if}
	</header>

	<section class="rounded-lg border border-gray-200 p-5">
		<dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
			<dt class="opacity-70">{t('admin.apiKeys.prefix')}</dt>
			<dd class="font-mono">{data.key.keyPrefix}…</dd>

			<dt class="opacity-70">{t('admin.apiKeys.scopes')}</dt>
			<dd class="font-mono">{data.key.scopes.join(', ')}</dd>

			<dt class="opacity-70">{t('admin.apiKeys.status')}</dt>
			<dd>
				{#if data.key.revokedAt}
					<span class="text-red-600">{t('admin.apiKeys.statusRevoked')}</span>
				{:else if data.key.suspendedAt}
					<span class="text-orange-600">{t('admin.apiKeys.statusSuspended')}</span>
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

			<dt class="opacity-70">{t('admin.apiKeys.suspendedAt')}</dt>
			<dd>{fmt(data.key.suspendedAt)}</dd>

			<dt class="opacity-70">{t('admin.apiKeys.lastUsedAt')}</dt>
			<dd>{fmt(data.key.lastUsedAt)}</dd>

			<dt class="opacity-70">{t('admin.apiKeys.createdBy')}</dt>
			<dd class="font-mono text-sm">{data.key.createdBy ?? '—'}</dd>
		</dl>
	</section>

	<section class="rounded-lg border border-gray-200 p-5 flex flex-col gap-4">
		<header class="flex flex-col gap-1">
			<h2 class="text-2xl">{t('admin.apiKeys.streamsTitle')}</h2>
			<p class="text-sm opacity-80">{t('admin.apiKeys.streamsHelp')}</p>
		</header>

		<form method="post" action="?/saveStreamSettings" class="flex flex-col gap-4">
			<label class="form-label">
				{t('admin.apiKeys.maxConcurrentStreams')}
				<span class="flex items-center gap-3 flex-wrap">
					<input
						class="form-input w-32"
						type="number"
						name="maxConcurrentStreams"
						min="1"
						step="1"
						value={data.key.maxConcurrentStreams ?? ''}
					/>
					<span class="text-sm opacity-70">
						{t('admin.apiKeys.openStreamsNow', { count: data.openStreams })}
					</span>
					<!-- Recovery button: skips field validation so a half-typed form cannot block it. -->
					<button
						type="submit"
						formaction="?/resetStreams"
						formnovalidate
						class="btn bg-red-600 text-white w-auto text-base"
						title={t('admin.apiKeys.resetStreamsTitle')}
						on:click={confirmResetStreams}
					>
						☢
					</button>
				</span>
				<span class="text-sm opacity-70">{t('admin.apiKeys.maxConcurrentStreamsHint')}</span>
			</label>

			<label class="form-label">
				{t('admin.apiKeys.streamLifetimeSeconds')}
				<input
					class="form-input w-32"
					type="number"
					name="streamLifetimeSeconds"
					min="1"
					max={MAX_STREAM_LIFETIME_SECONDS}
					step="1"
					value={data.key.streamLifetimeSeconds ?? ''}
				/>
				<span class="text-sm opacity-70">{t('admin.apiKeys.streamLifetimeSecondsHint')}</span>
			</label>

			{#each form?.error?.formErrors ?? [] as formError}
				<p class="text-red-600 text-sm">{formError}</p>
			{/each}
			{#each Object.values(form?.error?.fieldErrors ?? {}).flat() as fieldError}
				<p class="text-red-600 text-sm">{fieldError}</p>
			{/each}
			{#if form?.streamLifetimeTooLong}
				<p class="text-red-600 text-sm">
					{t('admin.apiKeys.streamLifetimeTooLong', { max: MAX_STREAM_LIFETIME_SECONDS })}
				</p>
			{/if}

			{#if form?.streamSettingsSaved}
				<p class="text-sm text-green-700">{t('admin.apiKeys.streamsSaved')}</p>
			{/if}
			{#if form?.streamsReset}
				<p class="text-sm text-green-700">{t('admin.apiKeys.streamsResetDone')}</p>
			{/if}

			<input
				type="submit"
				class="btn btn-blue self-start w-auto text-white text-base"
				value={t('admin.apiKeys.streamsSave')}
			/>
		</form>
	</section>

	<section class="rounded-lg border border-gray-200 p-5 flex flex-col gap-4">
		<header class="flex flex-col gap-1">
			<h2 class="text-2xl">{t('admin.apiKeys.suspiciousTitle')}</h2>
			<p class="text-sm opacity-80">{t('admin.apiKeys.suspiciousHelp')}</p>
		</header>
		{#if data.key.suspiciousAt}
			<p class="text-sm text-red-700">
				{t('admin.apiKeys.suspiciousSince', { date: fmt(data.key.suspiciousAt) })}
			</p>
			<form method="post" action="?/clearSuspicious">
				<input
					type="submit"
					class="btn btn-gray self-start w-auto text-base"
					value={t('admin.apiKeys.clearSuspicious')}
				/>
			</form>
		{/if}
		{#if data.suspiciousEvents.length}
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead>
						<tr class="border-b border-gray-200 opacity-70">
							<th class="py-2 pr-3 font-medium">{t('admin.apiKeys.logWhen')}</th>
							<th class="py-2 pr-3 font-medium">{t('admin.apiKeys.suspiciousEventType')}</th>
							<th class="py-2 pr-3 font-medium">{t('admin.apiKeys.logCall')}</th>
							<th class="py-2 font-medium">{t('admin.apiKeys.suspiciousEventDetail')}</th>
						</tr>
					</thead>
					<tbody>
						{#each data.suspiciousEvents as event}
							<tr class="border-b border-gray-100 last:border-0 align-top">
								<td class="py-2 pr-3 whitespace-nowrap">{fmt(event.at)}</td>
								<td class="py-2 pr-3">{t(`admin.apiKeys.suspiciousEvents.${event.type}`)}</td>
								<td class="py-2 pr-3 font-mono text-xs">{event.call}</td>
								<td class="py-2 font-mono text-xs break-all">{event.detail}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<p class="text-sm opacity-70">{t('admin.apiKeys.suspiciousEmpty')}</p>
		{/if}
	</section>

	<section class="rounded-lg border border-gray-200 p-5 flex flex-col gap-4">
		<h2 class="text-2xl">{t('admin.apiKeys.orderAccessTitle')}</h2>
		<form method="post" action="?/saveOrderAccess" class="flex flex-col gap-3">
			<label class="checkbox-label">
				<input
					type="checkbox"
					name="ownOrdersOnly"
					class="form-checkbox"
					checked={data.key.ownOrdersOnly}
				/>
				{t('admin.apiKeys.ownOrdersOnly')}
			</label>
			<p class="text-sm opacity-70">{t('admin.apiKeys.ownOrdersOnlyHint')}</p>
			{#if form?.orderAccessSaved}
				<p class="text-sm text-green-700">{t('admin.apiKeys.orderAccessSaved')}</p>
			{/if}
			<input
				type="submit"
				class="btn btn-blue self-start w-auto text-white text-base"
				value={t('admin.apiKeys.orderAccessSave')}
			/>
		</form>
	</section>

	<section class="rounded-lg border border-gray-200 p-5 flex flex-col gap-4">
		<h2 class="text-2xl">{t('admin.apiKeys.orderWritingTitle')}</h2>
		<form method="post" action="?/saveOrderWriting" class="flex flex-col gap-3">
			<label class="checkbox-label">
				<input
					type="checkbox"
					name="acceptDuplicateExternalOrderIds"
					class="form-checkbox"
					checked={data.key.acceptDuplicateExternalOrderIds}
				/>
				{t('admin.apiKeys.acceptDuplicateExternalOrderIds')}
			</label>
			<p class="text-sm opacity-70">{t('admin.apiKeys.acceptDuplicateExternalOrderIdsHint')}</p>
			{#if form?.orderWritingSaved}
				<p class="text-sm text-green-700">{t('admin.apiKeys.orderWritingSaved')}</p>
			{/if}
			<input
				type="submit"
				class="btn btn-blue self-start w-auto text-white text-base"
				value={t('admin.apiKeys.orderWritingSave')}
			/>
		</form>
	</section>

	{#if form?.alreadyRevoked}
		<p class="text-sm text-orange-600">{t('admin.apiKeys.statusRevoked')}</p>
	{/if}

	{#if !data.key.revokedAt}
		<section class="rounded-lg border border-gray-200 p-5 flex flex-col gap-3">
			<h2 class="text-2xl">{t('admin.apiKeys.suspensionTitle')}</h2>
			<p class="text-sm opacity-80">{t('admin.apiKeys.suspensionHelp')}</p>
			{#if data.key.suspendedAt}
				<form method="post" action="?/reactivate">
					<input
						type="submit"
						class="btn btn-blue text-white self-start w-auto text-base"
						value={t('admin.apiKeys.reactivate')}
					/>
				</form>
			{:else}
				<form method="post" action="?/suspend">
					<input
						type="submit"
						class="btn bg-orange-600 text-white self-start w-auto text-base"
						value={t('admin.apiKeys.suspend')}
					/>
				</form>
			{/if}
		</section>

		<form method="post" action="?/revoke">
			<input
				type="submit"
				class="btn btn-red text-white self-start w-auto text-base"
				value={t('admin.apiKeys.revoke')}
				on:click={confirmRevoke}
			/>
		</form>
	{/if}
</div>
