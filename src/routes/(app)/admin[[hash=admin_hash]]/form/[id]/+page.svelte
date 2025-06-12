<script lang="ts">
	import { MAX_CONTENT_LIMIT } from '$lib/types/CmsPage.js';
	import { MAX_NAME_LIMIT } from '$lib/types/Product';
	import { generateId } from '$lib/utils/generateId';

	export let data;
	let title = data.contactForm.title;
	let slug = data.contactForm._id;
	let displayFrom = data.contactForm.displayFromField;
	let mandatoryAgreement = !!data.contactForm.disclaimer;
	function confirmDelete(event: Event) {
		if (!confirm('Would you like to delete this Contact form?')) {
			event.preventDefault();
		}
	}
</script>

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
			disabled
		/>
	</label>
	<label class="form-label">
		target
		<input
			class="form-input block"
			type="text"
			name="target"
			placeholder="Target"
			value={data.contactForm.target}
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
			placeholder="From"
			bind:checked={displayFrom}
		/> Display From field
	</label>
	{#if displayFrom}
		<label class="checkbox-label">
			<input
				class="form-checkbox"
				type="checkbox"
				name="prefillWithSession"
				checked={data.contactForm.prefillWithSession}
			/> Prefill with session information
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
				value={data.contactForm.disclaimer?.label}
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
				value={data.contactForm.disclaimer?.content}
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
				value={data.contactForm.disclaimer?.checkboxLabel}
			/>
		</label>
	{/if}
	<label class="form-label">
		Subject
		<input
			class="form-input block"
			type="text"
			name="subject"
			placeholder="Subject"
			value={data.contactForm.subject}
			required
		/>
	</label>
	Content

	<textarea
		name="content"
		cols="30"
		rows="10"
		maxlength={MAX_CONTENT_LIMIT}
		value={data.contactForm.content}
		placeholder="message"
		class="form-input block w-full"
	/>
	<div class="flex flex-row justify-between gap-2">
		<input type="submit" class="btn btn-blue text-white" formaction="?/update" value="Update" />
		<a href="/form/{data.contactForm._id}" class="btn body-mainCTA">View</a>

		<input
			type="submit"
			class="btn btn-red text-white ml-auto"
			formaction="?/delete"
			value="Delete"
			on:click={confirmDelete}
		/>
	</div>
</form>
