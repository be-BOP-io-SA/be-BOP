<script lang="ts">
	import { languageNames, type LanguageKey } from '$lib/translations/index.js';
	import { MAX_DESCRIPTION_LIMIT, MAX_SHORT_DESCRIPTION_LIMIT } from '$lib/types/Product';

	export let data;

	let language: LanguageKey = 'fr';
</script>

<form method="post" class="contents">
	<label class="form-label">
		Select Language

		<select bind:value={language} name="language" class="form-input">
			{#each data.locales as locale}
				<option value={locale}>{languageNames[locale]}</option>
			{/each}
		</select>
	</label>

	<label class="form-label">
		Name
		<input
			type="text"
			name="name"
			class="form-input"
			placeholder={data.product.name}
			value={data.product.translations?.[language]?.name ?? ''}
		/>
	</label>

	<label class="form-label">
		Description
		<textarea
			name="description"
			class="form-input"
			rows="10"
			maxlength={MAX_DESCRIPTION_LIMIT}
			placeholder={data.product.description}
			value={data.product.translations?.[language]?.description ?? ''}
		/>
	</label>

	<label class="form-label">
		Short Description
		<textarea
			name="shortDescription"
			class="form-input"
			rows="2"
			maxlength={MAX_SHORT_DESCRIPTION_LIMIT}
			placeholder={data.product.shortDescription}
			value={data.product.translations?.[language]?.shortDescription ?? ''}
		/>
	</label>

	<label class="form-label">
		Custom Preorder Text
		<input
			type="text"
			name="customPreorderText"
			class="form-input"
			placeholder={data.product.customPreorderText}
			value={data.product.translations?.[language]?.customPreorderText ?? ''}
		/>
	</label>

	<label class="form-label">
		Content Before
		<textarea
			class="form-input"
			name="contentBefore"
			value={data.product.translations?.[language]?.contentBefore ?? ''}
			placeholder={data.product.contentBefore ?? ''}
		/>
	</label>

	<label class="form-label">
		Content After
		<textarea
			class="form-input"
			name="contentAfter"
			value={data.product.translations?.[language]?.contentAfter ?? ''}
			placeholder={data.product.contentAfter ?? ''}
		/>
	</label>
	<h2 class="text-2xl">Variations</h2>
	{#each Object.keys(data.product.variationLabels?.values || []) as key}
		<h3>{data.product.variationLabels?.names[key]}</h3>
		{#each Object.entries(data.product.variationLabels?.values[key] || '[]') as [valueKey, valueLabel]}
			<label for={valueKey} class="form-label">{valueLabel}</label>
			<input
				type="text"
				class="form-input"
				placeholder={valueLabel}
				value={data.product.translations?.[language]?.variationLabels?.values[key][valueKey] || ''}
				name="variationLabels.values[{key}][{valueKey}]"
			/>
		{/each}
	{/each}
	{#each Object.entries(data.product.variationLabels?.names || []) as [key, value]}
		<label for={key} class="form-label">{value}</label>
		<input
			type="text"
			class="form-input"
			placeholder={value}
			value={data.product.translations?.[language]?.variationLabels?.names[key] || ''}
			name="variationLabels.names[{key}]"
		/>
	{/each}
	<h2 class="text-2xl">CTA links</h2>

	{#each [...(data.product.translations?.[language]?.cta || []), ...Array(3).fill( { href: '', label: '' } )].slice(0, 3) as link, i}
		<div class="flex gap-4">
			<label class="form-label">
				Text
				<input
					type="text"
					name="cta[{i}].label"
					class="form-input"
					value={link.label}
					placeholder={data.product.cta?.[i]?.label}
				/>
			</label>
			<label class="form-label">
				Url
				<input
					type="text"
					name="cta[{i}].href"
					class="form-input"
					value={link.href}
					placeholder={data.product.cta?.[i]?.href}
				/>
			</label>
		</div>
	{/each}
	<h2 class="text-2xl">External Resource Hyperlinks</h2>

	{#each [...(data.product.translations?.[language]?.externalResources || []), ...Array(3).fill( { href: '', label: '' } )].slice(0, 3) as link, i}
		<div class="flex gap-4">
			<label class="form-label">
				Text
				<input
					type="text"
					name="externalResources[{i}].label"
					class="form-input"
					value={link.label}
					placeholder={data.product.externalResources?.[i]?.label}
				/>
			</label>
			<label class="form-label">
				Url
				<input
					type="text"
					name="externalResources[{i}].href"
					class="form-input"
					value={link.href}
					placeholder={data.product.externalResources?.[i]?.href}
				/>
			</label>
		</div>
	{/each}

	{#if data.product.hasSellDisclaimer}
		<label class="form-label">
			Disclaimer title
			<input
				name="sellDisclaimer.title"
				type="text"
				maxlength="60"
				value={data.product.translations?.[language]?.sellDisclaimer?.title || ''}
				placeholder={data.product.sellDisclaimer?.title ?? ''}
				class="form-input"
			/>
		</label>
		<label class="form-label">
			Disclaimer description
			<textarea
				name="sellDisclaimer.reason"
				cols="30"
				rows="2"
				maxlength={MAX_SHORT_DESCRIPTION_LIMIT}
				value={data.product.translations?.[language]?.sellDisclaimer?.reason || ''}
				placeholder={data.product.sellDisclaimer?.reason ?? ''}
				class="form-input"
			/>
		</label>
	{/if}
	<button class="btn btn-black self-start" type="submit">Save</button>
</form>
