<script lang="ts">
	import { onMount } from 'svelte';
	import { useI18n } from '$lib/i18n';
	import BEBOP_LOGO from '$lib/assets/bebop-light.svg';

	/** The be-BOP server this terminal is connected to. */
	export let server: { version: string; name: string; host: string };

	const { t } = useI18n();

	// The be-BOP-pos app gives its version; in a browser there is none.
	let appVersion = '';
	onMount(() => {
		const bridge = (
			window as unknown as { bebopPos?: { info?(): Promise<{ versionName?: string }> } }
		).bebopPos;
		bridge
			?.info?.()
			.then((info) => (appVersion = info.versionName ?? ''))
			.catch(() => undefined);
	});
</script>

<div class="flex flex-col items-center gap-1 text-center">
	<img src={BEBOP_LOGO} alt="be-BOP" class="h-16" />
	<p class="text-2xl font-semibold">POS</p>
	<p class="text-sm opacity-70">
		{t('pos.terminal.appVersion', { version: appVersion || '—' })} · {t(
			'pos.terminal.serverVersion',
			{ version: server.version }
		)}
	</p>
	<p class="text-sm opacity-70">{server.name} · {server.host}</p>
</div>
