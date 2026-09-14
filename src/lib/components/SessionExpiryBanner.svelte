<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { invalidateAll } from '$app/navigation';
	import { useI18n } from '$lib/i18n';
	import Trans from '$lib/components/Trans.svelte';

	export let expireUserAt: string;
	export let adminPrefix: string;
	/** Server time when the page was rendered, to count down on the shop's clock, not the browser's. */
	export let serverNow: string;

	const { t } = useI18n();

	const WARNING_THRESHOLD_MS = 5 * 60 * 1000;

	// Offset between the two clocks, measured once on render. A workstation a few minutes fast would
	// otherwise warn too late, or skip the warning entirely and log the user out mid-form.
	const clockOffsetMs = new Date(serverNow).getTime() - Date.now();

	let now = Date.now() + clockOffsetMs;
	let dismissed = false;
	let extending = false;
	let interval: ReturnType<typeof setInterval> | undefined;
	let lastPath = '';

	onMount(() => {
		interval = setInterval(() => {
			now = Date.now() + clockOffsetMs;
		}, 1000);
	});

	onDestroy(() => {
		if (interval) {
			clearInterval(interval);
		}
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
		if (extending) {
			return;
		}
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
	<div class="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white p-3 shadow" role="alert">
		<Trans key="admin.session.expiry.expired.message">
			<a slot="0" href="{adminPrefix}/login" class="underline" let:translation>
				{translation}
			</a>
		</Trans>
		{t('admin.session.expiry.expired.configHint')}
	</div>
{:else if isWarning && !dismissed}
	<div
		class="fixed top-0 left-0 right-0 z-50 bg-yellow-300 text-black p-3 shadow flex flex-wrap items-center gap-3"
		role="status"
		aria-live="polite"
	>
		<!-- The countdown ticks every second; announcing each tick would talk over the reader. The
		     message is announced once, the seconds are left to the eye. -->
		<span aria-hidden="true">{t('admin.session.expiry.warning.message', { countdown })}</span>
		<span class="sr-only">{t('admin.session.expiry.warning.screenReader')}</span>
		<button type="button" on:click={extend} disabled={extending} class="btn body-mainCTA">
			{t('admin.session.expiry.warning.extend')}
		</button>
		<button type="button" on:click={dismiss} class="underline">
			{t('admin.session.expiry.warning.ignore')}
		</button>
	</div>
{/if}
