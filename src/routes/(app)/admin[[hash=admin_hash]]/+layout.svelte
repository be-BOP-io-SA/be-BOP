<script lang="ts">
	import { navigating, page } from '$app/stores';
	import IconMenu from '~icons/ant-design/menu-outlined';
	import IconLogout from '~icons/ant-design/logout-outlined';
	import { slide } from 'svelte/transition';
	import { isAllowedOnPage } from '$lib/types/Role';
	import { adminLinks as adminLinksImported } from './adminLinks.js';
	import { POS_ROLE_ID } from '$lib/types/User.js';

	export let data;

	let navMenuOpen = false;
	$: if ($navigating) {
		navMenuOpen = false;
	}

	const adminLinks = adminLinksImported.map((link) => ({
		...link,
		links: link.links.map((l) => ({
			...l,
			href: l.href.replace('/admin', data.adminPrefix)
		}))
	}));
	function findSectionByHref(href: string) {
		for (const sectionItem of adminLinks) {
			for (const linkItem of sectionItem.links) {
				if (href.startsWith(linkItem.href)) {
					return sectionItem.section;
				}
			}
		}
	}
	$: isLoginPage = /^\/admin(-[0-9a-zA-Z]+)?\/login/.test($page.url.pathname);

	let sectionName = '';
	function updateSectionNameFromUrl() {
		sectionName = findSectionByHref(decodeURIComponent($page.url.pathname)) || '';
	}
	$: updateSectionNameFromUrl(), $page.url.pathname;
</script>

{#if !isLoginPage}
	<header class="bg-gray-400 text-gray-800 py-2 items-center flex">
		<div class="mx-auto max-w-7xl flex gap-3 px-6 grow flex-col">
			<nav class="flex gap-x-6 gap-y-2 font-light items-center">
				<button
					class="inline-flex flex-col justify-center sm:hidden cursor-pointer text-2xl transition"
					class:rotate-90={navMenuOpen}
					on:click={() => (navMenuOpen = !navMenuOpen)}
				>
					<IconMenu />
				</button>
				<span class="font-bold text-xl flex items-center gap-2">
					<a class="hover:underline" href={data.adminPrefix}>Admin</a>
					<form action="{data.adminPrefix}/logout" method="post" class="contents">
						<button type="submit">
							<span class="sr-only">Log out</span>
							<IconLogout class="text-red-500" />
						</button>
					</form>
				</span>
				{#each adminLinks as adminSection}
					<span class="text-xl hidden sm:inline">
						<a
							class={sectionName === adminSection.section ? 'underline' : ''}
							on:mouseenter={() => (sectionName = adminSection.section)}
							on:click|preventDefault={() => (sectionName = adminSection.section)}
							href="#{adminSection.section}">{adminSection.section}</a
						>
					</span>
				{/each}
				{#if data.hasPosOptions || data.roleId === POS_ROLE_ID}
					<a
						href="/pos"
						data-sveltekit-preload-data="off"
						class="{$page.url.pathname.startsWith('/pos')
							? 'underline'
							: ''} hidden sm:inline font-bold text-green-600"
					>
						POS session
					</a>
				{/if}
			</nav>
			<nav class="flex gap-x-6 items-center">
				{#each adminLinks.filter((item) => item.section === sectionName) as adminSection}
					<span class="font-bold text-xl hidden sm:inline">
						{adminSection.section}
					</span>
					{#each adminSection.links
						.filter((link) => {
							if (link.hidden) {
								return false;
							}
							if (!data.isBitcoinConfigured && link.href === `${data.adminPrefix}/bitcoind`) {
								return false;
							}
							if (!data.isLndConfigured && link.href === `${data.adminPrefix}/lnd`) {
								return false;
							}
							return true;
						})
						.filter((l) => (data.role ? isAllowedOnPage(data.role, l.href, 'read') : true)) as link}
						<a
							href={link.href}
							data-sveltekit-preload-data="off"
							class="{$page.url.pathname.startsWith(link.href)
								? 'underline'
								: ''}  hidden sm:inline"
							class:italic={data.role && !isAllowedOnPage(data.role, link.href, 'write')}
							class:opacity-70={data.role && !isAllowedOnPage(data.role, link.href, 'write')}
						>
							{link.label}
						</a>
					{/each}
				{/each}
			</nav>
		</div>
	</header>
{/if}
{#if navMenuOpen && !isLoginPage}
	<nav
		transition:slide
		class="bg-gray-400 text-gray-800 font-light flex flex-col sm:hidden border-x-0 border-b-0 border-opacity-25 border-t-1 border-white px-4 pb-3"
	>
		{#each adminLinks as adminSection}
			<span class="font-bold text-xl">
				{adminSection.section}
			</span>
			{#each adminSection.links.filter((link) => {
				if (link.hidden) {
					return false;
				}
				if (!data.isBitcoinConfigured && link.href === `${data.adminPrefix}/bitcoind`) {
					return false;
				}
				if (!data.isLndConfigured && link.href === `${data.adminPrefix}/lnd`) {
					return false;
				}
				return true;
			}) as link}
				<a
					href={link.href}
					class={$page.url.pathname.startsWith(link.href) ? 'underline' : ''}
					data-sveltekit-preload-data="off"
					class:italic={data.role && !isAllowedOnPage(data.role, link.href, 'write')}
					class:opacity-70={data.role && !isAllowedOnPage(data.role, link.href, 'write')}
				>
					{link.label}
				</a>
			{/each}
		{/each}
		{#if data.hasPosOptions || data.roleId === POS_ROLE_ID}
			<a
				href="/pos"
				data-sveltekit-preload-data="off"
				class="{$page.url.pathname.startsWith('/pos')
					? 'underline'
					: ''} hidden sm:inline font-bold text-green-600"
			>
				POS session
			</a>
		{/if}
	</nav>
{/if}
<svelte:head>
	<meta name="viewport" content="width=1000" />
</svelte:head>
<main class="p-4 flex flex-col gap-4 body-mainPlan {$page.data.bodyClass || ''}">
	<slot />
</main>
