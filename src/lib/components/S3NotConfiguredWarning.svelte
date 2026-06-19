<script lang="ts">
	/**
	 * Shown on admin pages that upload pictures (products, pictures, tag widgets,
	 * slider widgets, calendar events) when S3 storage is not configured yet —
	 * so the operator goes to /admin/s3 first instead of hitting an upload error.
	 */
	export let adminPrefix: string;
</script>

<p class="alert-warning">
	S3 storage is not configured. Configure it in
	<a href="{adminPrefix}/s3" class="underline">S3 settings</a>
	before uploading pictures.
</p>
