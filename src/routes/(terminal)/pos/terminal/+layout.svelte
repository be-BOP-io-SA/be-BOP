<script lang="ts">
	import { afterNavigate, beforeNavigate, goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import { useI18n } from '$lib/i18n';
	import IconMenu from '~icons/ant-design/menu-outlined';
	import IconClose from '~icons/ant-design/close-outlined';
	import IconWallet from '~icons/ant-design/wallet-outlined';
	import IconInfo from '~icons/ant-design/info-circle-outlined';
	import IconSwitch from '~icons/ant-design/user-switch-outlined';

	export let data;

	const { t } = useI18n();

	const HOME = '/pos/terminal';
	let menuOpen = false;

	// The back key of Android always leads to the home of the terminal: the history holds payments
	// that are paid or canceled and posted forms, none of which a terminal goes back to. From the
	// home it does nothing, and the home itself sends on to a payment that is waiting.
	beforeNavigate(({ type, cancel }) => {
		if (type !== 'popstate') {
			return;
		}
		cancel();
		if ($page.url.pathname !== HOME) {
			goto(HOME, { replaceState: true });
		}
	});
	afterNavigate(() => (menuOpen = false));

	// A payment that is waiting has no way out but its own screen: the menu is off there.
	$: waiting = $page.url.pathname.startsWith(`${HOME}/payment/`) && $page.data.status === 'pending';
	$: if (waiting) {
		menuOpen = false;
	}

	const link =
		'btn bg-white text-black border border-gray-300 flex items-center gap-3 text-xl py-4';
</script>

<div class="min-h-screen flex flex-col body-mainPlan">
	{#if data.menu}
		<header class="flex items-center justify-between p-4">
			<span class="text-sm opacity-70">{data.menu.who}</span>
			<button
				type="button"
				class="disabled:opacity-30"
				aria-label={t('pos.terminal.menu')}
				aria-expanded={menuOpen}
				disabled={waiting}
				on:click={() => (menuOpen = true)}
			>
				<IconMenu class="w-8 h-8" />
			</button>
		</header>
	{/if}

	<slot />
</div>

{#if menuOpen && data.menu}
	<nav class="fixed inset-0 z-10 flex flex-col gap-3 p-4 body-mainPlan">
		<button
			type="button"
			class="self-end"
			aria-label={t('pos.terminal.closeMenu')}
			on:click={() => (menuOpen = false)}
		>
			<IconClose class="w-8 h-8" />
		</button>
		{#if data.menu.session}
			<a href="{HOME}/till" class={link}>
				<IconWallet class="w-6 h-6" />
				<span class="grow text-left">{t('pos.terminal.till.title')}</span>
			</a>
		{/if}
		{#if data.menu.statusTicket}
			<a href="{HOME}/x" class={link}>
				<span class="grow text-left">{t('pos.terminal.xTitle')}</span>
			</a>
		{/if}
		<a href="{HOME}/about" class={link}>
			<IconInfo class="w-6 h-6" />
			<span class="grow text-left">{t('pos.terminal.about.title')}</span>
		</a>
		<form
			method="post"
			action="{HOME}?/lock"
			use:enhance={() =>
				async ({ update }) => {
					await update();
					// Whatever screen it was locked from, the terminal starts again from its home.
					await goto(HOME, { replaceState: true, invalidateAll: true });
				}}
		>
			<button type="submit" class="{link} w-full">
				<IconSwitch class="w-6 h-6" />
				<span class="grow text-left">{t('pos.terminal.switchOperator')}</span>
			</button>
		</form>
	</nav>
{/if}
