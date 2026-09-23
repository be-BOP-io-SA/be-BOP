<script lang="ts">
	import { useI18n } from '$lib/i18n';
	import { MAX_CONTENT_LIMIT } from '$lib/types/CmsPage';
	import type { ContactForm } from '$lib/types/ContactForm';
	import { MAX_NAME_LIMIT } from '$lib/types/Product';
	import { page } from '$app/stores';
	export let contactForm: Pick<
		ContactForm,
		| '_id'
		| 'subject'
		| 'content'
		| 'target'
		| 'displayFromField'
		| 'prefillWithSession'
		| 'disclaimer'
	>;
	export let sessionEmail: string | undefined = undefined;
	let className = '';
	export { className as class };

	let subject = contactForm.subject;
	let content = contactForm.content;
	let mandatoryAgreement = false;
	const { t } = useI18n();
</script>

<form
	method="post"
	action="/form/{contactForm._id}?/sendEmail"
	class="relative mx-auto tagWidget flex flex-col gap-4 tagWidget-main p-6 rounded {className}"
>
	{#if contactForm.displayFromField}
		<label class="form-label">
			{t('contactForm.from')}
			<input
				class="form-input"
				type="text"
				maxlength={MAX_NAME_LIMIT}
				name="from"
				placeholder="From"
				value={contactForm.prefillWithSession && $page.data.contactModes.includes('email')
					? sessionEmail ?? ''
					: ''}
				pattern={$page.data.contactModes.includes('email') &&
				$page.data.contactModes.includes('nostr')
					? '^npub.*|^.*@.*'
					: $page.data.contactModes.includes('email')
					? '^.*@.*'
					: $page.data.contactModes.includes('nostr')
					? '^npub.*'
					: '^(?!npub).*'}
			/>
		</label>
	{/if}
	<label class="form-label">
		{t('contactForm.subject')}
		<input
			class="form-input"
			type="text"
			maxlength={MAX_NAME_LIMIT}
			name="subject"
			placeholder="Subject"
			bind:value={subject}
		/>
	</label>
	<label class="form-label">
		{t('contactForm.content')}

		<textarea
			name="content"
			cols="20"
			rows="5"
			placeholder="message"
			maxlength={MAX_CONTENT_LIMIT}
			bind:value={content}
			class="form-input block w-full"
		></textarea>
	</label>
	{#if contactForm.disclaimer}
		<h2 class="text-xl font-bold">{contactForm.disclaimer?.label}</h2>
		<p>{contactForm.disclaimer?.content}</p>
		<label class="checkbox-label">
			<input
				class="form-checkbox"
				type="checkbox"
				name="mandatoryAgreement"
				bind:checked={mandatoryAgreement}
			/>
			{contactForm.disclaimer?.checkboxLabel}
		</label>
	{/if}
	<button
		type="submit"
		class="btn tagWidget-cta"
		disabled={contactForm.disclaimer && !mandatoryAgreement}>{t('contact.form.contactUs')}</button
	>
</form>
