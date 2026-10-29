<script>
	import ContactForm from '$lib/components/ContactForm.svelte';
	import CmsTagSnippet from '$lib/components/CmsTagSnippet.svelte';

	export let data;
</script>

<CmsTagSnippet tag="[Form={data.contactForm._id}]" />
<ContactForm contactForm={data.contactForm} sessionEmail={data.email} />
