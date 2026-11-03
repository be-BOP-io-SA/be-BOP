<script lang="ts">
	import { useI18n } from '$lib/i18n';

	export let data;

	const { t } = useI18n();
</script>

<a href="{data.adminPrefix}/form/new" class="underline block">{t('admin.form.addContactForm')}</a>

<h1 class="text-3xl">{t('admin.form.listOfContactForm')}</h1>

<ul>
	{#each data.contactForms as contactForm}
		<li>
			{contactForm._id} -
			<a href="{data.adminPrefix}/form/{contactForm._id}" class="underline body-hyperlink"
				>{contactForm.title}</a
			>
		</li>
	{:else}
		{t('admin.form.noContactFormYet')}
	{/each}
</ul>
