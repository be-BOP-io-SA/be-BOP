<script lang="ts">
	import { enhance } from '$app/forms';
	import { typedKeys } from '$lib/utils/typedKeys.js';
	import IconTrash from '$lib/components/icons/IconTrash.svelte';
	import type { TagFamily } from '$lib/types/TagFamily';
	import S3NotConfiguredWarning from '$lib/components/S3NotConfiguredWarning.svelte';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	export let data;

	// Local state for families (following /admin/pos pattern)
	$: families = data.families.map((f) => ({ ...f }));

	async function copyToClipboard(text: string) {
		await navigator.clipboard.writeText(text);
	}

	$: serializedFamilies = JSON.stringify(families);

	// Group tags by family
	$: tagsByFamily = families.map((family) => ({
		family,
		tags: data.tags.filter((tag) => tag.family === family._id)
	}));

	// Orphan tags (no family)
	$: orphanTags = data.tags.filter((tag) => !tag.family);

	// Expand/collapse state - default all to expanded
	let expandedFamilies: Record<string, boolean> = {};
	$: {
		for (const family of families) {
			if (expandedFamilies[family._id] === undefined) {
				expandedFamilies[family._id] = true;
			}
		}
		if (expandedFamilies['_orphan'] === undefined) {
			expandedFamilies['_orphan'] = true;
		}
	}

	function expandAll() {
		for (const family of families) {
			expandedFamilies[family._id] = true;
		}
		expandedFamilies['_orphan'] = true;
		expandedFamilies = expandedFamilies;
	}

	function collapseAll() {
		for (const family of families) {
			expandedFamilies[family._id] = false;
		}
		expandedFamilies['_orphan'] = false;
		expandedFamilies = expandedFamilies;
	}

	// New family input
	let newFamilyName = '';

	function addFamily() {
		if (!newFamilyName.trim()) {
			return;
		}
		const newFamily: TagFamily = {
			_id: `temp-${Date.now()}`,
			name: newFamilyName.trim(),
			order: families.length,
			createdAt: new Date(),
			updatedAt: new Date()
		};
		families = [...families, newFamily];
		expandedFamilies[newFamily._id] = true;
		newFamilyName = '';
	}

	function deleteFamily(familyId: string) {
		const family = families.find((f) => f._id === familyId);
		const tagsInFamily = data.tags.filter((t) => t.family === familyId).length;

		if (tagsInFamily > 0) {
			if (
				!confirm(
					t('admin.tags.deleteFamilyConfirm', { name: family?.name ?? '', count: tagsInFamily })
				)
			) {
				return;
			}
		}

		families = families.filter((f) => f._id !== familyId);
		delete expandedFamilies[familyId];
	}

	// Special tags
	const specialTags = {
		'pos-favorite': t('admin.tags.posFavoriteDescription')
	};
	const tagsMap = new Map(data.tags.map((tag) => [tag._id, tag]));
</script>

{#if !data.s3IsConfigured}
	<S3NotConfiguredWarning adminPrefix={data.adminPrefix} />
{/if}

<a href="{data.adminPrefix}/tags/new" class="underline block mb-4">{t('admin.tags.createNew')}</a>

<h1 class="text-3xl mb-4">{t('admin.tags.listTitle')}</h1>

<!-- Legend -->
<div class="mb-4 text-sm text-gray-600 flex flex-wrap gap-3">
	<span class="font-semibold">{t('admin.tags.legend')}</span>
	<span title={t('admin.tags.widgetUseOnly')}>🧩 {t('admin.tags.widgetOnly')}</span>
	<span title={t('admin.tags.productTagging')}>🏷️ {t('admin.tags.productTagging')}</span>
	<span title={t('admin.tags.lightDarkMode')}>🌓 {t('admin.tags.lightDark')}</span>
	<span title={t('admin.tags.reportingFilter')}>📊 {t('admin.tags.reporting')}</span>
	<span title={t('admin.tags.printReceiptFilter')}>🧾 {t('admin.tags.receipt')}</span>
</div>

<!-- Expand/Collapse All -->
<div class="flex gap-2 mb-4">
	<button class="btn btn-gray text-sm" on:click={expandAll}>{t('admin.tags.expandAll')}</button>
	<button class="btn btn-gray text-sm" on:click={collapseAll}>{t('admin.tags.collapseAll')}</button>
</div>

<!-- Family management (following /admin/pos pattern) -->
<form method="post" action="?/saveFamilies" use:enhance class="mb-6 p-4 bg-gray-100 rounded">
	<h2 class="text-xl mb-2">{t('admin.tags.tagFamilies')}</h2>

	<div class="flex gap-2 items-end mb-4">
		<label class="form-label">
			{t('admin.tags.newFamilyName')}
			<input
				type="text"
				class="form-input"
				bind:value={newFamilyName}
				placeholder={t('admin.tags.enterFamilyName')}
				on:keydown={(e) => e.key === 'Enter' && (e.preventDefault(), addFamily())}
			/>
		</label>
		<button type="button" class="btn btn-black" on:click={addFamily}
			>{t('admin.tags.addFamily')}</button
		>
	</div>

	{#if families.length > 0}
		<div class="space-y-2 mb-4">
			{#each families as family, idx (family._id)}
				<div class="flex items-center gap-2 bg-white p-2 rounded border">
					<span class="text-gray-500 text-sm w-6">{idx + 1}.</span>
					<input
						type="text"
						bind:value={family.name}
						class="form-input flex-1"
						placeholder={t('admin.tags.familyNamePlaceholder')}
					/>
					<button
						type="button"
						class="text-red-500 hover:text-red-700"
						title={t('admin.tags.deleteFamilyTitle')}
						on:click={() => deleteFamily(family._id)}
					>
						<IconTrash />
					</button>
				</div>
			{/each}
		</div>
	{/if}

	<input type="hidden" name="families" value={serializedFamilies} />
	<button type="submit" class="btn btn-blue text-white">{t('admin.tags.saveFamilies')}</button>
</form>

<!-- Tag families list -->
<div class="space-y-4">
	{#each tagsByFamily as { family, tags }}
		<div class="border-l-4 border-gray-300 pl-4">
			<div class="flex items-center gap-2">
				<span>{t('admin.tags.familyLabel')}</span>
				<b>{family.name}</b>
				<a
					href="#{family._id}"
					class="text-blue-500 underline text-sm"
					on:click|preventDefault={() =>
						(expandedFamilies[family._id] = !expandedFamilies[family._id])}
				>
					({expandedFamilies[family._id]
						? t('admin.tags.collapseText')
						: t('admin.tags.expandText')})
				</a>
				<span class="text-gray-500 text-sm"
					>{t('admin.tags.tagsCount', { count: tags.length })}</span
				>
			</div>

			{#if expandedFamilies[family._id]}
				<ul class="ml-5 mt-2">
					{#each tags as tag}
						<li>
							<a href="{data.adminPrefix}/tags/{tag._id}" class="underline text-blue-600">
								{tag.name}
							</a>
							<button
								class="text-gray-500 text-sm hover:text-blue-500 cursor-pointer"
								title={t('admin.tags.copyToClipboard')}
								on:click={() => copyToClipboard(`[Tag=${tag._id}]`)}>[Tag={tag._id}]</button
							>
							{#if tag.widgetUseOnly}<span title={t('admin.tags.widgetUseOnly')}>🧩</span>{/if}
							{#if tag.productTagging}<span title={t('admin.tags.productTagging')}>🏷️</span>{/if}
							{#if tag.useLightDark}<span title={t('admin.tags.lightDarkMode')}>🌓</span>{/if}
							{#if tag.reportingFilter}<span title={t('admin.tags.reportingFilter')}>📊</span>{/if}
							{#if tag.printReceiptFilter}<span title={t('admin.tags.printReceiptFilter')}>🧾</span
								>{/if}
						</li>
					{:else}
						<li class="text-gray-500 italic">{t('admin.tags.noTagsInFamily')}</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/each}

	<!-- Orphan tags -->
	{#if orphanTags.length > 0 || families.length === 0}
		<div class="border-l-4 border-orange-300 pl-4">
			<div class="flex items-center gap-2">
				<span>{t('admin.tags.familyLabel')}</span>
				<b class="text-orange-600">{t('admin.tags.notAssociatedToFamily')}</b>
				<a
					href="#orphan"
					class="text-blue-500 underline text-sm"
					on:click|preventDefault={() =>
						(expandedFamilies['_orphan'] = !expandedFamilies['_orphan'])}
				>
					({expandedFamilies['_orphan']
						? t('admin.tags.collapseText')
						: t('admin.tags.expandText')})
				</a>
				<span class="text-gray-500 text-sm"
					>{t('admin.tags.tagsCount', { count: orphanTags.length })}</span
				>
			</div>

			{#if expandedFamilies['_orphan']}
				<ul class="ml-5 mt-2">
					{#each orphanTags as tag}
						<li>
							<a href="{data.adminPrefix}/tags/{tag._id}" class="underline text-blue-600">
								{tag.name}
							</a>
							<button
								class="text-gray-500 text-sm hover:text-blue-500 cursor-pointer"
								title={t('admin.tags.copyToClipboard')}
								on:click={() => copyToClipboard(`[Tag=${tag._id}]`)}>[Tag={tag._id}]</button
							>
							{#if tag.widgetUseOnly}<span title={t('admin.tags.widgetUseOnly')}>🧩</span>{/if}
							{#if tag.productTagging}<span title={t('admin.tags.productTagging')}>🏷️</span>{/if}
							{#if tag.useLightDark}<span title={t('admin.tags.lightDarkMode')}>🌓</span>{/if}
							{#if tag.reportingFilter}<span title={t('admin.tags.reportingFilter')}>📊</span>{/if}
							{#if tag.printReceiptFilter}<span title={t('admin.tags.printReceiptFilter')}>🧾</span
								>{/if}
						</li>
					{:else}
						<li class="text-gray-500 italic">{t('admin.tags.noOrphanTags')}</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}
</div>

<!-- Special tags section -->
{#if typedKeys(specialTags).some((key) => tagsMap.has(key))}
	<h2 class="text-2xl mt-8 mb-2">{t('admin.tags.existingSpecialTags')}</h2>

	<table class="border border-gray-300 divide-y divide-gray-300 border-collapse">
		<thead>
			<tr>
				<th class="text-left border border-gray-300 p-2">{t('admin.tags.tagSlug')}</th>
				<th class="text-left border border-gray-300 p-2">{t('admin.tags.description')}</th>
			</tr>
		</thead>
		<tbody>
			{#each typedKeys(specialTags).filter((key) => tagsMap.has(key)) as specialTag}
				<tr>
					<td class="border border-gray-300 p-2">
						<a href="{data.adminPrefix}/tags/{specialTag}" class="underline body-hyperlink">
							{specialTag}
						</a>
					</td>
					<td class="border border-gray-300 p-2">{specialTags[specialTag]}</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}

{#if typedKeys(specialTags).some((key) => !tagsMap.has(key))}
	<h2 class="text-2xl mt-8 mb-2">{t('admin.tags.suggestions')}</h2>

	<table class="border border-gray-300 divide-y divide-gray-300 border-collapse">
		<thead>
			<tr>
				<th class="text-left border border-gray-300 p-2">{t('admin.tags.tagSlug')}</th>
				<th class="text-left border border-gray-300 p-2">{t('admin.tags.description')}</th>
			</tr>
		</thead>
		<tbody>
			{#each typedKeys(specialTags).filter((key) => !tagsMap.has(key)) as specialTag}
				<tr>
					<td class="border border-gray-300 p-2">
						<a href="{data.adminPrefix}/tags/new?id={specialTag}" class="underline body-hyperlink">
							{specialTag}
						</a>
					</td>
					<td class="border border-gray-300 p-2">{specialTags[specialTag]}</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}
