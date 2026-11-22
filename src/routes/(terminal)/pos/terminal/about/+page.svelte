<script lang="ts">
	import { onMount } from 'svelte';
	import { useI18n } from '$lib/i18n';
	import TerminalBrand from '../TerminalBrand.svelte';

	export let data;

	const { t } = useI18n();

	// The be-BOP-pos app gives its own build; in a browser there is none.
	let app = '—';
	onMount(async () => {
		const bridge = (
			window as unknown as {
				bebopPos?: { info?(): Promise<{ versionName?: string; versionCode?: number }> };
			}
		).bebopPos;
		try {
			const info = await bridge?.info?.();
			if (info?.versionName) {
				app = `${info.versionName}${info.versionCode ? ` (${info.versionCode})` : ''}`;
			}
		} catch {
			app = '—';
		}
	});

	const yesNo = (value: boolean) =>
		value ? t('pos.terminal.about.yes') : t('pos.terminal.about.no');
</script>

<main class="flex-1 flex flex-col items-center gap-4 p-4 body-mainPlan">
	<TerminalBrand server={data.server} />
	<h1 class="text-2xl">{t('pos.terminal.about.title')}</h1>

	<dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 w-full max-w-md">
		<dt class="opacity-70">{t('pos.terminal.about.beBop')}</dt>
		<dd>{data.server.version}</dd>
		<dt class="opacity-70">{t('pos.terminal.about.app')}</dt>
		<dd>{app}</dd>
		<dt class="opacity-70">{t('pos.terminal.about.server')}</dt>
		<dd>{data.server.name} · {data.server.host}</dd>
		<dt class="opacity-70">{t('pos.terminal.about.terminal')}</dt>
		<dd>{data.terminal.name} · {data.terminal.operator}</dd>
		<dt class="opacity-70">{t('pos.terminal.about.currency')}</dt>
		<dd>{data.config.currency}</dd>
		<dt class="opacity-70">{t('pos.terminal.about.methods')}</dt>
		<dd>
			{data.config.methods
				.map((method) =>
					method === 'card'
						? t('pos.terminal.methodCardStripe')
						: t(`checkout.paymentMethod.${method}`)
				)
				.join(', ') || '—'}
		</dd>
		<dt class="opacity-70">{t('pos.terminal.about.sessions')}</dt>
		<dd>{yesNo(data.config.sessions)}</dd>
		<dt class="opacity-70">{t('pos.terminal.about.sessionRequired')}</dt>
		<dd>{yesNo(data.config.sessionRequired)}</dd>
	</dl>
</main>
