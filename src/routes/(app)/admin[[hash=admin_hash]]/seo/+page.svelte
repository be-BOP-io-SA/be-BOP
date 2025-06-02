<script lang="ts">
	export let data;
	export let form;
</script>

<h1 class="text-2xl">SEO Config</h1>
{#if form?.success}
	<div class="alert alert-success">{form.success}</div>
{/if}
<form method="post" class="flex flex-col gap-4" action="?/update">
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="hideFromSearchEngines"
			class="form-checkbox"
			checked={data.hideFromSearchEngines}
		/>
		Hide from search engines
	</label>
	<input type="submit" value="Update" class="btn body-mainCTA self-start" />
</form>
