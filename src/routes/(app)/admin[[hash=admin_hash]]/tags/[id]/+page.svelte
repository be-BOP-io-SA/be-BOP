<script lang="ts">
	import { generateId } from '$lib/utils/generateId';
	import PictureComponent from '$lib/components/Picture.svelte';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	export let data;
	let name = data.tag.name;
	let slug = data.tag._id;
	function confirmDelete(event: Event) {
		if (!confirm(t('admin.tags.confirmDeleteTag'))) {
			event.preventDefault();
		}
	}
	let tagCtaLines = data.tag.cta.length || 2;
</script>

<form method="post" class="flex flex-col gap-4" action="?/update">
	<label class="form-label">
		{t('admin.tags.tagNameLabel')}
		<input
			class="form-input"
			type="text"
			name="name"
			placeholder={t('admin.tags.tagNamePlaceholder')}
			bind:value={name}
			on:change={() => (slug = generateId(name, false))}
			on:input={() => (slug = generateId(name, false))}
			required
		/>
	</label>

	<label class="form-label">
		{t('admin.tags.slug')}

		<input
			class="form-input block"
			type="text"
			name="slug"
			placeholder={t('admin.tags.slug')}
			bind:value={slug}
			title={t('admin.tags.slugHint')}
			required
			disabled
		/>
	</label>
	<label class="checkbox-label">
		<input
			class="form-checkbox"
			type="checkbox"
			bind:checked={data.tag.widgetUseOnly}
			name="widgetUseOnly"
		/>
		{t('admin.tags.forWidgetUseOnly')}
	</label>
	<label class="checkbox-label">
		<input
			class="form-checkbox"
			type="checkbox"
			bind:checked={data.tag.productTagging}
			name="productTagging"
		/>
		{t('admin.tags.availableForProductTagging')}
	</label>
	<label class="checkbox-label">
		<input
			class="form-checkbox"
			type="checkbox"
			bind:checked={data.tag.useLightDark}
			name="useLightDark"
		/>
		{t('admin.tags.useLightDarkInvertedMode')}
	</label>
	<label class="checkbox-label">
		<input
			class="form-checkbox"
			type="checkbox"
			bind:checked={data.tag.reportingFilter}
			name="reportingFilter"
		/>
		{t('admin.tags.availableAsFilterForReporting')}
	</label>
	<label class="checkbox-label">
		<input
			class="form-checkbox"
			type="checkbox"
			bind:checked={data.tag.printReceiptFilter}
			name="printReceiptFilter"
		/>
		{t('admin.tags.useTagForFilterPrintedReceipts')}
	</label>
	<div class="flex flex-col gap-4 w-[20em]">
		<label class="form-label">
			{t('admin.tags.tagFamilyLabel')}
			<select class="form-input" name="family" value={data.tag.family || ''}>
				<option value="">{t('admin.tags.noFamily')}</option>
				{#each data.families as family}
					<option value={family._id}>{family.name}</option>
				{/each}
			</select>
		</label>
	</div>

	<label class="form-label">
		{t('admin.tags.tagTitleLabel')}
		<input
			class="form-input"
			type="text"
			bind:value={data.tag.title}
			name="title"
			placeholder={t('admin.tags.tagTitleLabel')}
		/>
	</label>
	<label class="form-label">
		{t('admin.tags.tagSubtitleLabel')}
		<input
			class="form-input"
			type="text"
			bind:value={data.tag.subtitle}
			name="subtitle"
			placeholder={t('admin.tags.tagSubtitleLabel')}
		/>
	</label>
	<label class="form-label">
		{t('admin.tags.shortContent')}
		<textarea
			name="shortContent"
			bind:value={data.tag.shortContent}
			cols="30"
			rows="2"
			class="form-input"
		/>
	</label>
	<label class="form-label">
		{t('admin.tags.fullContent')}
		<textarea
			name="content"
			bind:value={data.tag.content}
			cols="30"
			rows="10"
			maxlength="10000"
			class="form-input"
		/>
	</label>

	<h3 class="text-xl">{t('admin.tags.ctas')}</h3>
	{#each [...data.tag.cta, ...Array(tagCtaLines).fill( { label: '', href: '', openNewTab: false } )].slice(0, tagCtaLines) as cta, i}
		<div class="flex gap-4">
			<label class="form-label">
				{t('admin.tags.ctaText')}
				<input type="text" name="cta[{i}].label" class="form-input" value={cta.label || ''} />
			</label>
			<label class="form-label">
				{t('admin.tags.ctaUrl')}
				<input type="text" name="cta[{i}].href" class="form-input" value={cta.href || ''} />
			</label>
			<label class="checkbox-label mt-4">
				<input
					class="form-checkbox"
					type="checkbox"
					name="cta[{i}].openNewTab"
					checked={cta.openNewTab}
				/>
				{t('admin.tags.openInNewTab')}
			</label>
			<button
				type="button"
				class="self-start mt-8"
				on:click={() => {
					(data.tag.cta = data.tag.cta.filter(
						(ctaLink) => ctaLink.href !== cta.href && ctaLink.label !== cta.label
					)),
						(tagCtaLines -= 1);
				}}>🗑️</button
			>
		</div>
	{/each}
	<button class="btn body-mainCTA self-start" on:click={() => (tagCtaLines += 1)} type="button"
		>{t('admin.tags.addCtas')}
	</button>

	<label class="form-label">
		{t('admin.tags.cssOverride')}
		<textarea
			name="cssOverride"
			bind:value={data.tag.cssOveride}
			cols="30"
			rows="10"
			maxlength="10000"
			class="form-input"
		/>
	</label>
	<div class="flex flex-row justify-between gap-2">
		<input
			type="submit"
			class="btn btn-blue self-start text-white"
			value={t('admin.action.update')}
		/>
		<a href="/tag/{data.tag._id}" class="btn body-mainCTA">{t('admin.tags.view')}</a>

		<button
			type="submit"
			class="ml-auto btn btn-red"
			formaction="?/delete"
			on:click={confirmDelete}
		>
			{t('admin.tags.delete')}
		</button>
	</div>
</form>

<h2 class="text-2xl my-4">{t('admin.tags.photos')}</h2>
{#if data.pictures.length < 5}
	<a href="/admin/picture/new?tagId={data.tag._id}" class="underline"
		>{t('admin.tags.addPicture')}</a
	>
{/if}
<div class="flex flex-row flex-wrap gap-6 mt-6">
	{#each data.pictures as picture}
		<div class="flex flex-col text-center">
			<a href="{data.adminPrefix}/picture/{picture._id}" class="flex flex-col items-center">
				<PictureComponent {picture} class="h-36 block" style="object-fit: scale-down;" />
				<span>{picture.name} / {picture.tag ? picture.tag.type : ''}</span>
			</a>
		</div>
	{/each}
</div>
