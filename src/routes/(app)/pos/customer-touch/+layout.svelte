<script lang="ts">
	import Picture from '$lib/components/Picture.svelte';
	import DEFAULT_LOGO from '$lib/assets/bebop-light.svg';
	import DEFAULT_LOGO_DARK from '$lib/assets/bebop-dark.svg';
	import IconModeLight from '$lib/components/icons/IconModeLight.svelte';
	import IconModeDark from '$lib/components/icons/IconModeDark.svelte';
	import IconSystem from '$lib/components/icons/IconSystem.svelte';
	import theme from '$lib/stores/theme.js';
	import { useI18n } from '$lib/i18n.js';
	import { onDestroy, onMount } from 'svelte';

	export let data;
	const { locale } = useI18n();
	let open = false;

	const options = [
		{ value: 'light', label: 'Clair', icon: IconModeLight },
		{ value: 'dark', label: 'Sombre', icon: IconModeDark },
		{ value: 'system', label: 'Système', icon: IconSystem }
	];
	const flagEmojis = {
		en: '🇬🇧',
		'es-sv': '🇸🇻',
		fr: '🇫🇷',
		nl: '🇳🇱',
		it: '🇮🇹',
		de: '🇩🇪'
	};

	function setTheme(value: string) {
		$theme = value as 'light' | 'dark' | 'system';
		localStorage.setItem('theme', value);
		open = false;
	}

	let currentTime = '';
	let interval: ReturnType<typeof setInterval>;
	function updateTime() {
		const now = new Date();
		const timeString = now.toLocaleTimeString($locale, {
			hour: '2-digit',
			minute: '2-digit'
		});
		const dateString = now.toLocaleDateString($locale, {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		});
		currentTime = `${timeString} ${dateString}`;
	}
	onMount(() => {
		updateTime();
		interval = setInterval(updateTime, 1000);
	});
	onDestroy(() => {
		if (interval) {
			clearInterval(interval);
		}
	});
</script>

<svelte:head>
	<meta name="viewport" content="width=500" />
</svelte:head>
<main class="fixed top-0 bottom-0 right-0 left-0 bg-white px-4 flex flex-col overflow-hidden">
	<div class="shrink-0 flex items-center justify-between w-full">
		<div class="font-sans">{currentTime}</div>

		<div class="flex flex-col items-center">
			{#if data.logoPicture}
				<div class="w-24 h-16">
					<Picture class="dark:hidden object-contain" picture={data.logoPicture} />
					<Picture
						class="hidden dark:inline  object-contain"
						picture={data.logoPictureDark || data.logoPicture}
					/>
				</div>
			{:else}
				<img class="hidden dark:inline w-24 h-16 object-contain" src={DEFAULT_LOGO} alt="" />
				<img class="dark:hidden w-24 h-16 object-contain" src={DEFAULT_LOGO_DARK} alt="" />
			{/if}

			<div class="text-xl font-bold tracking-widest">{data.brandName}</div>
			<div class="text-sm font-sans">{data.brandName}</div>
		</div>

		<div class="flex items-center space-x-4">
			{#if !data.hideThemeSelectorInToolbar}
				<div class="flex relative">
					<button
						class="ml-4 flex items-center gap-2 rounded text-xl"
						on:click={() => (open = !open)}
					>
						{#each options as opt (opt.value)}
							{#if opt.value === $theme}
								<svelte:component this={opt.icon} class="w-5 h-5" />
							{/if}
						{/each}
					</button>

					{#if open}
						<div class="absolute right-10 mt-2 shadow-lg rounded z-10 navbar">
							{#each options as opt}
								<button
									class="flex items-center gap-2 w-full px-4 py-2 text-left"
									on:click={() => setTheme(opt.value)}
								>
									<svelte:component this={opt.icon} class="w-5 h-5" />
									<span class="hidden lg:contents">{opt.label}</span>
								</button>
							{/each}
						</div>
					{/if}
				</div>
			{/if}

			{#if !data.disableLanguageSelector && data.locales.length > 1}
				<select
					class="ml-4 border-0 cursor-pointer rounded appearance-none bg-none bg-transparent text-xl p-0"
					size="0"
					bind:value={$locale}
					on:change={() => {
						document.cookie = `lang=${$locale};path=/;max-age=31536000`;
						window.location.reload();
					}}
				>
					{#each Object.entries(flagEmojis) as [locale, flag]}
						<option style="background-color: var(--navbar-backgroundColor);" value={locale}>
							{flag}
						</option>
					{/each}
				</select>
			{/if}
		</div>
	</div>
	<div class="flex-1 min-h-0 flex flex-col body-mainPlan">
		<slot />
	</div>
</main>
