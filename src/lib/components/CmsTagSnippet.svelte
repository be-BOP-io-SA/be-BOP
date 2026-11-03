<script lang="ts">
	import { page } from '$app/stores';
	import { useI18n } from '$lib/i18n';
	import { CUSTOMER_ROLE_ID } from '$lib/types/User';

	export let tag: string;

	const { t } = useI18n();

	// Widget view pages are public; the tag only helps staff writing CMS pages.
	$: isStaff = !!$page.data.roleId && $page.data.roleId !== CUSTOMER_ROLE_ID;

	let copied = false;

	async function copy() {
		await navigator.clipboard.writeText(tag);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

{#if isStaff}
	<div class="flex flex-wrap items-center gap-2 text-sm" data-testid="cms-tag-snippet">
		<span class="text-gray-600">{t('admin.cmsTag.label')}</span>
		<code class="px-2 py-1 rounded bg-gray-100 text-gray-800 select-all">{tag}</code>
		<button type="button" class="btn btn-gray py-1 px-2 text-sm" on:click={copy}>
			{copied ? t('admin.cmsTag.copied') : t('admin.cmsTag.copy')}
		</button>
	</div>
{/if}
