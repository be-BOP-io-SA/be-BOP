<script lang="ts">
	import { MAX_CONTENT_LIMIT } from '$lib/types/CmsPage';
	import { MAX_NAME_LIMIT } from '$lib/types/Product';
	import { generateId } from '$lib/utils/generateId';

	export let data;
	let title = '';
	let slug = '';
	let displayFrom = false;
	let mandatoryAgreement = false;
</script>

<h1 class="text-3xl">Add a contact form</h1>
<p>
	<kbd class="kbd">{'{{websiteLink}}'}</kbd>, <kbd class="kbd">{'{{brandName}}'}</kbd>,
	<kbd class="kbd">{'{{pageLink}}'}</kbd>
	and
	<kbd class="kbd">{'{{pageName}}'}</kbd> are always available in templates.
</p>
<form method="post" class="flex flex-col gap-4">
	<label class="form-label">
		Title
		<input
			class="form-input"
			type="text"
			maxlength={MAX_NAME_LIMIT}
			name="title"
			placeholder="title"
			bind:value={title}
			on:change={() => (slug = generateId(title, true))}
			on:input={() => (slug = generateId(title, true))}
			required
		/>
	</label>

	<label class="form-label">
		Slug
		<input
			class="form-input block"
			type="text"
			name="slug"
			placeholder="Slug"
			bind:value={slug}
			title="Only lowercase letters, numbers and dashes are allowed"
			required
		/>
	</label>

	<label class="form-label">
		target
		<input
			class="form-input block"
			type="text"
			name="target"
			placeholder="Target"
			value={data.contactModes.includes('email') ? data.sellerIdentity?.contact.email || '' : ''}
			required
			pattern={data.contactModes.includes('email') && data.contactModes.includes('nostr')
				? '^npub.*|^.*@.*'
				: data.contactModes.includes('email')
				? '^.*@.*'
				: data.contactModes.includes('nostr')
				? '^npub.*'
				: '^(?!npub).*'}
		/>
	</label>
	<label class="checkbox-label">
		<input
			class="form-checkbox"
			type="checkbox"
			name="displayFromField"
			bind:checked={displayFrom}
		/> Display From: field
	</label>
	{#if displayFrom}
		<label class="checkbox-label">
			<input class="form-checkbox" type="checkbox" name="prefillWithSession" placeholder="From" /> Prefill
			with session information
		</label>{/if}
	<label class="checkbox-label">
		<input
			class="form-checkbox"
			type="checkbox"
			name="mandatoryAgreement"
			bind:checked={mandatoryAgreement}
		/> Add a warning to the form with mandatory agreement
	</label>
	{#if mandatoryAgreement}
		<label class="form-label">
			Disclaimer label
			<input
				class="form-input block"
				type="text"
				name="disclaimer.label"
				placeholder="Disclaimer label"
				required
			/>
		</label>
		Disclaimer Content
		<label class="form-label">
			<textarea
				name="disclaimer.content"
				cols="30"
				rows="5"
				maxlength={MAX_CONTENT_LIMIT}
				placeholder="message"
				class="form-input block w-full"
			/>
		</label>
		<label class="form-label">
			Disclaimer checkbox label
			<input
				class="form-input block"
				type="text"
				name="disclaimer.checkboxLabel"
				placeholder="Disclaimer checkbox label"
				required
			/>
		</label>
	{/if}

	<label class="form-label">
		Subject
		<input class="form-input block" type="text" name="subject" placeholder="Subject" required />
	</label>

	Content
	<label class="form-label">
		<textarea
			name="content"
			cols="30"
			rows="10"
			maxlength={MAX_CONTENT_LIMIT}
			placeholder="message"
			class="form-input block w-full"
		/>
	</label>
	<input type="submit" class="btn btn-blue self-start text-white" value="Submit" />
</form>
