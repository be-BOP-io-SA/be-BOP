<script lang="ts">
	export let data;
	export let form;
</script>

<h1 class="text-2xl">Age restriction</h1>
{#if form?.success}
	<div class="alert alert-success">{form.success}</div>
{/if}
<form method="post" class="flex flex-col gap-4" action="?/update">
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="ageRestrictionEnabled"
			class="form-checkbox"
			checked={data.ageRestriction.enabled}
		/>
		My online business needs age limitation & validation
	</label>
	<label class="form-label">
		Legal reason
		<input
			type="input"
			name="legalReason"
			class="form-input"
			value={data.ageRestriction.legalReason}
		/>
	</label>
	<input type="submit" value="Update" class="btn body-mainCTA self-start" />
</form>
