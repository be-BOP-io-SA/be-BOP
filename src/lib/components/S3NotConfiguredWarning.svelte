<script lang="ts">
	import Trans from '$lib/components/Trans.svelte';

	/**
	 * Shown on admin pages that upload pictures (products, pictures, tag widgets,
	 * slider widgets, calendar events) when S3 storage is not configured yet —
	 * so the operator goes to /admin/s3 first instead of hitting an upload error.
	 */
	export let adminPrefix: string;
</script>

<p class="alert-warning">
	<Trans key="admin.s3.notConfiguredWarning">
		<a href="{adminPrefix}/s3" class="underline" slot="0" let:translation>{translation}</a>
	</Trans>
</p>
