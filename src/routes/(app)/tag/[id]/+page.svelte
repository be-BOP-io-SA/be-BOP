<script lang="ts">
	import CmsTagSnippet from '$lib/components/CmsTagSnippet.svelte';
	import TagWidget from '$lib/components/TagWidget.svelte';

	export let data;

	const renderings: { display: string; titleCase?: 'regular' }[] = [
		{ display: 'var-1' },
		{ display: 'var-1', titleCase: 'regular' },
		{ display: 'var-1-reverse' },
		{ display: 'var-2' },
		{ display: 'var-3' },
		{ display: 'var-4' },
		{ display: 'var-4-reverse' },
		{ display: 'var-5' },
		{ display: 'var-6' }
	];
</script>

<main class="mx-auto max-w-7xl py-10 px-6">
	<article
		class="w-full rounded-xl body-secondPlan border-gray-300 border py-3 px-3 flex flex-col gap-2"
	>
		{#each renderings as { display, titleCase }}
			<CmsTagSnippet
				tag="[Tag={data.tag._id}?display={display}{titleCase ? `?titleCase=${titleCase}` : ''}]"
			/>
			<TagWidget tag={data.tag} displayOption={display} {titleCase} pictures={data.pictures} />
		{/each}
	</article>
</main>
