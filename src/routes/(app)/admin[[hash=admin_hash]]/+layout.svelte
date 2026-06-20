<script lang="ts">
	import { navigating, page } from '$app/stores';
	import IconMenu from '~icons/ant-design/menu-outlined';
	import IconLogout from '~icons/ant-design/logout-outlined';
	import IconSearch from '~icons/ant-design/search-outlined';
	import IconStar from '~icons/ant-design/star-outlined';
	import IconStarFilled from '~icons/ant-design/star-filled';
	import IconChevronDown from '~icons/ant-design/down-outlined';
	import IconChevronRight from '~icons/ant-design/right-outlined';
	import { isAllowedOnPage } from '$lib/types/Role';
	import { adminLinks as adminLinksImported } from './adminLinks.js';
	import { POS_ROLE_ID, SUPER_ADMIN_ROLE_ID } from '$lib/types/User.js';

	export let data;

	let sidebarOpen = false;
	let searchTerm = '';
	let bookmarks: string[] = data.backOfficeBookmarks ?? [];
	const BOOKMARKS_SECTION = 'Bookmarks';
	let expandedSections = new Set<string>(bookmarks.length > 0 ? [BOOKMARKS_SECTION] : []);
	let lastSeenSection: string | null = null;

	$: if ($navigating) {
		sidebarOpen = false;
	}
	$: bookmarks = data.backOfficeBookmarks ?? [];

	const adminLinks = adminLinksImported.map((s) => ({
		...s,
		links: s.links.map((l) => ({
			...l,
			canonicalHref: l.href,
			href: l.href.replace('/admin', data.adminPrefix)
		}))
	}));

	function findSectionByHref(href: string): string | null {
		for (const s of adminLinks) {
			for (const l of s.links) {
				if (href.startsWith(l.href)) {
					return s.section;
				}
			}
		}
		return null;
	}

	$: isLoginPage = /^\/admin(-[0-9a-zA-Z]+)?\/login/.test($page.url.pathname);
	$: currentSection = findSectionByHref(decodeURIComponent($page.url.pathname));

	// Auto-expand the section of the page the user navigates to (without fighting manual collapses).
	$: if (currentSection && currentSection !== lastSeenSection) {
		expandedSections.add(currentSection);
		expandedSections = expandedSections;
		lastSeenSection = currentSection;
	}

	$: trimmedSearch = searchTerm.trim().toLowerCase();
	$: hasSearch = trimmedSearch.length > 0;

	$: regularSections = adminLinks
		.map((s) => {
			const allowed = s.links.filter((link) => {
				if (link.hidden) {
					return false;
				}
				if (link.superAdminOnly && data.roleId !== SUPER_ADMIN_ROLE_ID) {
					return false;
				}
				if (data.disabledAdminEntries?.includes(link.canonicalHref)) {
					return false;
				}
				if (!data.isBitcoinConfigured && link.href === `${data.adminPrefix}/bitcoind`) {
					return false;
				}
				if (!data.isLndConfigured && link.href === `${data.adminPrefix}/lnd`) {
					return false;
				}
				if (data.role && !isAllowedOnPage(data.role, link.href, 'read')) {
					return false;
				}
				if (trimmedSearch) {
					return link.label.toLowerCase().includes(trimmedSearch);
				}
				return true;
			});
			// Bookmarked first, non-bookmarked after, original order preserved within each group.
			const bookmarked = allowed.filter((l) => bookmarks.includes(l.canonicalHref));
			const rest = allowed.filter((l) => !bookmarks.includes(l.canonicalHref));
			return { ...s, visibleLeaves: [...bookmarked, ...rest] };
		})
		.filter((s) => s.visibleLeaves.length > 0);

	// Synthetic "Bookmarks" section gathering every visible bookmarked leaf, A→Z by label.
	$: bookmarksSection =
		bookmarks.length > 0
			? {
					section: BOOKMARKS_SECTION,
					icon: IconStarFilled,
					visibleLeaves: regularSections
						.flatMap((s) => s.visibleLeaves)
						.filter((l) => bookmarks.includes(l.canonicalHref))
						.sort((a, b) => a.label.localeCompare(b.label))
			  }
			: null;

	$: visibleSections = bookmarksSection ? [bookmarksSection, ...regularSections] : regularSections;

	function toggleSection(name: string) {
		if (expandedSections.has(name)) {
			expandedSections.delete(name);
		} else {
			expandedSections.add(name);
		}
		expandedSections = expandedSections;
	}

	function expandAll() {
		expandedSections = new Set(visibleSections.map((s) => s.section));
	}

	function collapseAll() {
		expandedSections = new Set();
	}

	async function toggleBookmark(canonicalHref: string) {
		const res = await fetch(`${data.adminPrefix}/back-office-bookmark`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ href: canonicalHref })
		});
		if (res.ok) {
			const json = (await res.json()) as { bookmarks: string[] };
			bookmarks = json.bookmarks;
		}
	}
</script>

{#if isLoginPage}
	<main class="p-4 flex flex-col gap-4 body-mainPlan {$page.data.bodyClass || ''}">
		<slot />
	</main>
{:else}
	<div class="flex min-h-screen">
		{#if sidebarOpen}
			<button
				class="md:hidden fixed inset-0 bg-black bg-opacity-40 z-30"
				on:click={() => (sidebarOpen = false)}
				aria-label="Close menu"
				tabindex="-1"
			/>
		{/if}

		<aside
			class="bg-gray-400 text-gray-800 w-64 shrink-0 flex-col gap-3 p-4 fixed md:sticky top-0 left-0 h-screen z-40 overflow-y-auto {sidebarOpen
				? 'flex'
				: 'hidden md:flex'}"
		>
			<div class="flex items-center justify-between gap-2 font-bold text-xl">
				<a class="hover:underline" href={data.adminPrefix}>Admin</a>
				<form action="{data.adminPrefix}/logout" method="post" class="contents">
					<button type="submit">
						<span class="sr-only">Log out</span>
						<IconLogout class="text-red-500" />
					</button>
				</form>
			</div>

			<label class="flex items-center gap-2 bg-white bg-opacity-70 rounded px-2 py-1">
				<IconSearch />
				<input
					type="search"
					bind:value={searchTerm}
					placeholder="Search…"
					class="bg-transparent border-0 outline-none w-full p-0 text-sm focus:ring-0"
				/>
			</label>

			<a
				href={data.adminPrefix}
				data-sveltekit-preload-data="off"
				class="flex items-center gap-2 text-sm py-0.5"
				class:underline={$page.url.pathname === data.adminPrefix}
			>
				<span aria-hidden="true">🏠</span>
				Home
			</a>

			<div class="flex gap-3 text-xs">
				<button type="button" class="underline" on:click={expandAll}>Expand all</button>
				<button type="button" class="underline" on:click={collapseAll}>Collapse all</button>
			</div>

			<nav class="flex flex-col gap-1">
				{#each visibleSections as section (section.section)}
					<div class="flex flex-col">
						<button
							type="button"
							class="flex items-center gap-2 font-bold text-base py-1 text-left hover:underline"
							on:click={() => toggleSection(section.section)}
						>
							<svelte:component this={section.icon} />
							<span class="flex-1">{section.section}</span>
							{#if hasSearch || expandedSections.has(section.section)}
								<IconChevronDown />
							{:else}
								<IconChevronRight />
							{/if}
						</button>
						{#if hasSearch || expandedSections.has(section.section)}
							<div class="flex flex-col gap-0.5 pl-6">
								{#each section.visibleLeaves as link (link.canonicalHref)}
									<div class="flex items-center gap-2">
										<button
											type="button"
											class="text-yellow-700 leading-none"
											on:click={() => toggleBookmark(link.canonicalHref)}
											aria-label={bookmarks.includes(link.canonicalHref)
												? 'Remove bookmark'
												: 'Add bookmark'}
										>
											{#if bookmarks.includes(link.canonicalHref)}
												<IconStarFilled />
											{:else}
												<IconStar />
											{/if}
										</button>
										<a
											href={link.href}
											data-sveltekit-preload-data="off"
											class="flex-1 text-sm py-0.5"
											class:underline={$page.url.pathname.startsWith(link.href)}
											class:italic={data.role && !isAllowedOnPage(data.role, link.href, 'write')}
											class:opacity-70={data.role &&
												!isAllowedOnPage(data.role, link.href, 'write')}
										>
											{link.label}
										</a>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			</nav>

			{#if data.hasPosOptions || data.roleId === POS_ROLE_ID}
				<a
					href="/pos"
					data-sveltekit-preload-data="off"
					class="font-bold text-green-700 mt-2"
					class:underline={$page.url.pathname.startsWith('/pos')}
				>
					POS session
				</a>
			{/if}
		</aside>

		<main class="flex-1 p-4 flex flex-col gap-4 body-mainPlan {$page.data.bodyClass || ''}">
			<button
				type="button"
				class="md:hidden self-start bg-gray-400 text-gray-800 rounded p-2 text-2xl"
				on:click={() => (sidebarOpen = !sidebarOpen)}
				aria-label="Toggle admin menu"
			>
				<IconMenu />
			</button>
			<slot />
		</main>
	</div>
{/if}

<svelte:head>
	<meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>
