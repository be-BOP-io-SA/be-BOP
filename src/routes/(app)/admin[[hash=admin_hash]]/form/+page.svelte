<script lang="ts">
	export let data;
</script>

<a href="{data.adminPrefix}/form/new" class="underline block">Add contact form</a>

<h1 class="text-3xl">List of Contact Form</h1>

<ul>
	{#each data.contactForms as contactForm}
		<li>
			{contactForm._id} -
			<a href="{data.adminPrefix}/form/{contactForm._id}" class="underline">{contactForm.title}</a>
		</li>
	{:else}
		No contact form yet
	{/each}
</ul>
