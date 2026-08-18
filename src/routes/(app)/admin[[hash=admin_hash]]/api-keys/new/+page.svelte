<script lang="ts">
	import { onMount } from 'svelte';
	import { useI18n } from '$lib/i18n.js';
	import { groupScopesByCategory } from '$lib/types/ApiV1';

	export let data;
	export let form;

	const { t } = useI18n();

	let expiresLocal = '';
	/**
	 * Browser UTC offset for the no-JS fallback. Filled on mount, never server-rendered: evaluating
	 * getTimezoneOffset() during SSR sends the *server* offset and expires the key at the wrong
	 * instant for any admin in another zone.
	 */
	let expiresOffsetMinutes = '';

	onMount(() => {
		expiresOffsetMinutes = String(new Date().getTimezoneOffset());
	});

	let selectedScopes: Record<string, boolean> = Object.fromEntries(
		data.scopes.map((scope: string) => [scope, false])
	);

	$: groups = groupScopesByCategory(data.scopes);

	const SCOPE_HINT_KEYS: Record<string, string> = {
		'orders:write': 'admin.apiKeys.scopeHint.ordersWrite',
		'catalog:read': 'admin.apiKeys.scopeHint.catalogRead',
		'orders:read': 'admin.apiKeys.scopeHint.ordersRead'
	};

	function setScopes(scopes: string[], value: boolean) {
		selectedScopes = {
			...selectedScopes,
			...Object.fromEntries(scopes.map((scope) => [scope, value]))
		};
	}

	function selectAll() {
		setScopes(data.scopes, true);
	}

	function selectNone() {
		setScopes(data.scopes, false);
	}

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

		<fieldset class="flex flex-col gap-2">
			<legend class="form-label">{t('admin.apiKeys.scopes')}</legend>
			<p class="text-sm opacity-70">{t('admin.apiKeys.scopesHint')}</p>
			<div class="flex flex-wrap gap-2 text-sm">
				<button type="button" class="underline body-hyperlink" on:click={selectAll}>
					{t('admin.apiKeys.selectAll')}
				</button>
				<span class="opacity-40" aria-hidden="true">·</span>
				<button type="button" class="underline body-hyperlink" on:click={selectNone}>
					{t('admin.apiKeys.selectNone')}
				</button>
			</div>
			<div
				class="max-h-64 overflow-y-auto rounded-md border border-gray-200 p-3 flex flex-col gap-4"
			>
				{#each groups as group}
					<div class="flex flex-col gap-2">
						<div class="flex flex-wrap items-baseline justify-between gap-2">
							<span class="font-mono text-sm font-medium">{group.category}</span>
							<div class="flex gap-2 text-xs">
								<button
									type="button"
									class="underline body-hyperlink"
									on:click={() => setScopes(group.scopes, true)}
								>
									{t('admin.apiKeys.selectAll')}
								</button>
								<button
									type="button"
									class="underline body-hyperlink"
									on:click={() => setScopes(group.scopes, false)}
								>
									{t('admin.apiKeys.selectNone')}
								</button>
							</div>
						</div>
						{#each group.scopes as scope}
							<label class="flex flex-col gap-0.5">
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
					</div>
				{/each}
			</div>
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
			<input type="hidden" name="expiresAtOffsetMinutes" bind:value={expiresOffsetMinutes} />
			<span class="text-sm opacity-70">{t('admin.apiKeys.expiresAtHint')}</span>
		</label>

		{#if form?.error}
			<p class="text-red-600">{t('admin.apiKeys.createError')}</p>
			{#each form.error.formErrors ?? [] as formError}
				<p class="text-red-600 text-sm">{formError}</p>
			{/each}
		{/if}

		<input
			type="submit"
			class="btn btn-blue self-start w-auto text-white text-base"
			value={t('admin.apiKeys.create')}
		/>
	</form>
</div>
