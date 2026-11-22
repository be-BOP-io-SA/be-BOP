<script lang="ts">
	import { afterNavigate, beforeNavigate, goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import { useI18n } from '$lib/i18n';
	import theme from '$lib/stores/theme';
	import { languageNames, type LanguageKey } from '$lib/translations';
	import IconModeLight from '$lib/components/icons/IconModeLight.svelte';
	import IconModeDark from '$lib/components/icons/IconModeDark.svelte';
	import IconSystem from '$lib/components/icons/IconSystem.svelte';
	import IconMenu from '~icons/ant-design/menu-outlined';
	import IconClose from '~icons/ant-design/close-outlined';
	import IconWallet from '~icons/ant-design/wallet-outlined';
	import IconInfo from '~icons/ant-design/info-circle-outlined';
	import IconList from '~icons/ant-design/unordered-list-outlined';
	import IconSwitch from '~icons/ant-design/user-switch-outlined';

	export let data;

	const { t, locale } = useI18n();

	const themes = [
		{ value: 'light', label: 'pos.terminal.themeLight', icon: IconModeLight },
		{ value: 'dark', label: 'pos.terminal.themeDark', icon: IconModeDark },
		{ value: 'system', label: 'pos.terminal.themeSystem', icon: IconSystem }
	] as const;

	// The languages of the shop by their own name, in alphabetical order. The one selected is the one the
	// server chose: the language of the phone if the shop has it, else the default one of the shop.
	$: languageOptions = (data.menu?.locales ?? [])
		.map((code) => ({ code, name: languageNames[code as LanguageKey] ?? code }))
		.sort((a, b) => a.name.localeCompare(b.name, $locale));

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

	const link = 'btn pos-secondary flex items-center gap-3 text-xl py-4';
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
	<nav class="fixed inset-0 z-10 flex flex-col gap-3 p-4 overflow-y-auto body-mainPlan">
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
		<a href="{HOME}/payments" class={link}>
			<IconList class="w-6 h-6" />
			<span class="grow text-left">{t('pos.terminal.paidPayments')}</span>
		</a>
		<a href="{HOME}/about" class={link}>
			<IconInfo class="w-6 h-6" />
			<span class="grow text-left">{t('pos.terminal.about.title')}</span>
		</a>
		<div class="flex gap-2">
			{#each themes as option}
				<button
					type="button"
					class="btn pos-secondary grow flex flex-col items-center gap-1 py-3 {$theme ===
					option.value
						? 'ring-4 ring-[#31a5dc]'
						: ''}"
					aria-pressed={$theme === option.value}
					on:click={() => ($theme = option.value)}
				>
					<svelte:component this={option.icon} class="w-6 h-6" />
					<span class="text-sm">{t(option.label)}</span>
				</button>
			{/each}
		</div>
		{#if data.menu.locales.length > 1}
			<label class="form-label text-lg">
				{t('pos.terminal.language')}
				<select
					class="form-input text-xl"
					bind:value={$locale}
					on:change={() => {
						document.cookie = `lang=${$locale};path=/;max-age=31536000`;
						window.location.reload();
					}}
				>
					{#each languageOptions as option}
						<option value={option.code}>{option.name}</option>
					{/each}
				</select>
			</label>
		{/if}
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

<style>
	/* The colors of the be-BOP logo: light blue for the main action, navy for the second one and the keys' lines. */
	:global(.btn.pos-key) {
		background-color: #ffffff;
		color: #003760;
		border: 2px solid #003760;
	}
	:global(.btn.pos-cta) {
		background-color: #31a5dc;
		color: #ffffff;
		border: 0;
	}
	:global(.btn.pos-cta:active) {
		background-color: #003760;
	}
	:global(.btn.pos-cta2) {
		background-color: #003760;
		color: #ffffff;
		border: 0;
	}
	:global(.btn.pos-secondary) {
		background-color: #ffffff;
		color: #003760;
		border: 2px solid #31a5dc;
	}
	:global(.btn.pos-secondary:active) {
		background-color: #31a5dc;
		color: #ffffff;
	}
	:global(html.dark .btn.pos-key) {
		background-color: #003760;
		color: #ffffff;
		border: 2px solid #31a5dc;
	}
	:global(html.dark .btn.pos-secondary) {
		background-color: transparent;
		color: #ffffff;
	}
</style>
