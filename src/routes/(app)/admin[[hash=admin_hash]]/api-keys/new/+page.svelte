<script lang="ts">
	import { useI18n } from '$lib/i18n.js';

	export let data;
	export let form;

	const { t } = useI18n();

	let expiresLocal = '';

	let selectedScopes: Record<string, boolean> = Object.fromEntries(
		data.scopes.map((scope: string) => [scope, scope === 'orders:write'])
	);

	const SCOPE_HINT_KEYS: Record<string, string> = {
		'orders:write': 'admin.apiKeys.scopeHint.ordersWrite',
		'catalog:read': 'admin.apiKeys.scopeHint.catalogRead',
		'orders:read': 'admin.apiKeys.scopeHint.ordersRead'
	};

	/** Convert datetime-local (browser local wall time) to ISO with zone before POST. */
	function onSubmit(event: Event) {
		const formEl = event.currentTarget as HTMLFormElement;
		const hidden = formEl.elements.namedItem('expiresAt') as HTMLInputElement | null;
		const offset = formEl.elements.namedItem('expiresAtOffsetMinutes') as HTMLInputElement | null;
		if (offset) {
			offset.value = String(new Date().getTimezoneOffset());
		}
		if (!hidden) {
			return;
		}
		if (!expiresLocal) {
			hidden.value = '';
			return;
		}
		const d = new Date(expiresLocal);
		hidden.value = Number.isNaN(d.getTime()) ? '' : d.toISOString();
	}
</script>

<div class="flex flex-col gap-6 max-w-xl">
	<a href="{data.adminPrefix}/api-keys" class="underline body-hyperlink self-start">
		{t('admin.apiKeys.backToList')}
	</a>

	<header class="flex flex-col gap-2">
		<h1 class="text-3xl">{t('admin.apiKeys.createTitle')}</h1>
		<p class="text-sm opacity-80">{t('admin.apiKeys.secretStorageNote')}</p>
	</header>

	<form
		method="post"
		action="?/createApiKey"
		class="rounded-lg border border-gray-200 p-5 flex flex-col gap-4"
		on:submit={onSubmit}
	>
		<label class="form-label">
			{t('admin.apiKeys.name')}
			<input
				class="form-input"
				type="text"
				name="name"
				maxlength="200"
				required
				placeholder={t('admin.apiKeys.namePlaceholder')}
			/>
		</label>

		<label class="form-label">
			{t('admin.apiKeys.environment')}
			<select class="form-input" name="environment" required>
				<option value="live">{t('admin.apiKeys.environmentBadgeLive')}</option>
				<option value="test">{t('admin.apiKeys.environmentBadgeTest')}</option>
			</select>
			<span class="text-sm opacity-70">{t('admin.apiKeys.environmentHelp')}</span>
		</label>

		<fieldset class="flex flex-col gap-3">
			<legend class="form-label">{t('admin.apiKeys.scopes')}</legend>
			{#each data.scopes as scope}
				<label class="flex flex-col gap-1">
					<span class="flex items-center gap-2 flex-wrap">
						<input
							type="checkbox"
							name="scopes"
							value={scope}
							bind:checked={selectedScopes[scope]}
						/>
						<span class="font-mono text-sm">{scope}</span>
					</span>
					{#if SCOPE_HINT_KEYS[scope]}
						<span class="text-sm opacity-70 ml-6">{t(SCOPE_HINT_KEYS[scope])}</span>
					{/if}
				</label>
			{/each}
		</fieldset>

		<label class="form-label">
			{t('admin.apiKeys.expiresAt')}
			<!-- name kept for no-JS fallback; JS overwrites hidden expiresAt with ISO. -->
			<input
				class="form-input"
				type="datetime-local"
				name="expiresAtLocal"
				bind:value={expiresLocal}
			/>
			<input type="hidden" name="expiresAt" value="" />
			<input type="hidden" name="expiresAtOffsetMinutes" value={new Date().getTimezoneOffset()} />
			<span class="text-sm opacity-70">{t('admin.apiKeys.expiresAtHint')}</span>
		</label>

		{#if form?.error}
			<p class="text-red-600">{t('admin.apiKeys.createError')}</p>
		{/if}

		<input
			type="submit"
			class="btn btn-blue self-start w-auto text-white text-base"
			value={t('admin.apiKeys.create')}
		/>
	</form>
</div>
