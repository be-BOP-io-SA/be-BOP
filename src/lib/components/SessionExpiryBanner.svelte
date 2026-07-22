<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { invalidateAll } from '$app/navigation';
	import { useI18n } from '$lib/i18n';
	import Trans from '$lib/components/Trans.svelte';

	export let expireUserAt: string;
	export let adminPrefix: string;

	const { t } = useI18n();

	const WARNING_THRESHOLD_MS = 5 * 60 * 1000;

	let now = Date.now();
	let dismissed = false;
	let extending = false;
	let interval: ReturnType<typeof setInterval> | undefined;
	let lastPath = '';

	onMount(() => {
		interval = setInterval(() => {
			now = Date.now();
		}, 1000);
	});

	onDestroy(() => {
		if (interval) clearInterval(interval);
	});

	$: if ($page.url.pathname !== lastPath) {
		lastPath = $page.url.pathname;
		dismissed = false;
	}

	$: expiryMs = new Date(expireUserAt).getTime();
	$: msRemaining = expiryMs - now;
	$: isExpired = msRemaining <= 0;
	$: isWarning = !isExpired && msRemaining <= WARNING_THRESHOLD_MS;

	$: countdown = formatCountdown(msRemaining);

	function formatCountdown(ms: number): string {
		const s = Math.max(0, Math.ceil(ms / 1000));
		const mm = String(Math.floor(s / 60)).padStart(2, '0');
		const ss = String(s % 60).padStart(2, '0');
		return `${mm}:${ss}`;
	}

	async function extend() {
		if (extending) return;
		extending = true;
		try {
			const res = await fetch(`${adminPrefix}/session/extend`, {
				method: 'POST',
				redirect: 'manual'
			});
			if (res.ok) {
				await invalidateAll();
			}
		} finally {
			extending = false;
		}
	}

	function dismiss() {
		dismissed = true;
	}
</script>

{#if isExpired}
	<div
		class="fixed top-0 inset-x-0 z-[1000] bg-red-600 text-white px-4 py-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm shadow-lg"
		role="alert"
	>
		<span>
			<Trans key="admin.session.expiry.expired.message">
				<a slot="0" href="{adminPrefix}/login" class="underline font-semibold" let:translation>
					{translation}
				</a>
			</Trans>
		</span>
		<span class="opacity-90">{t('admin.session.expiry.expired.configHint')}</span>
	</div>
{:else if isWarning && !dismissed}
	<div
		class="fixed top-0 inset-x-0 z-[1000] bg-orange-500 text-white px-4 py-3 flex flex-wrap items-center justify-center gap-3 text-sm shadow-lg"
		role="alert"
	>
		<span>{t('admin.session.expiry.warning.message', { countdown })}</span>
		<button
			type="button"
			on:click={extend}
			disabled={extending}
			class="bg-white text-orange-700 px-3 py-1 rounded font-semibold disabled:opacity-60"
		>
			{t('admin.session.expiry.warning.extend')}
		</button>
		<button
			type="button"
			on:click={dismiss}
			class="border border-white px-3 py-1 rounded hover:bg-white hover:bg-opacity-10"
		>
			{t('admin.session.expiry.warning.ignore')}
		</button>
	</div>
{/if}
