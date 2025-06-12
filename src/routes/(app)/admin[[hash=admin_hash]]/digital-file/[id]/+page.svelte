<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import IconCopy from '~icons/ant-design/copy-outlined';
	import IconCheckmark from '~icons/ant-design/check-outlined';
	import { useI18n } from '$lib/i18n';

	export let data;

	let copiedLinkPicture = false;
	const { t } = useI18n();
</script>

<form method="post" action="?/update" use:enhance class="flex flex-col gap-4">
	{#if data.digitalFile.productId}
		<a
			href="{data.adminPrefix}/product/{data.digitalFile.productId}"
			class="underline body-hyperlink text-center"
		>
			Back to product
		</a>
	{:else}
		<a href="{data.adminPrefix}/digital-file" class="underline body-hyperlink text-center">
			Back to files
		</a>
	{/if}

	<input type="text" name="name" class="form-input" value={data.digitalFile.name} />
	<a href={data.downloadLink} target="_blank" class="underline body-hyperlink text-center"
		>Download file</a
	>
	<div class="flex gap-4 justify-between">
		<input type="submit" value="Update" class="btn body-mainCTA" />
		<input type="submit" value="Delete" formaction="?/delete" class="btn btn-red" />
	</div>
</form>
{#if data.digitalFile.secret}
	<h2 class="text-md font-light">
		This permanently valid link can be used to share the file to anyone
	</h2>
	<code>
		{`${$page.url.origin}/digital-file/raw/${data.digitalFile._id}?key=${data.digitalFile.secret}`}
		<button
			class="inline-block body-secondaryText"
			type="button"
			on:click={() => {
				window.navigator.clipboard.writeText(
					`${$page.url.origin}/digital-file/raw/${data.digitalFile._id}?key=${data.digitalFile.secret}`
				);
				copiedLinkPicture = true;
			}}
			>{#if copiedLinkPicture}
				<IconCheckmark class="inline-block mb-1" />
				{t('general.copied')}
			{:else}
				<IconCopy class="inline-block mb-1" />
			{/if}</button
		>
	</code>
{/if}
