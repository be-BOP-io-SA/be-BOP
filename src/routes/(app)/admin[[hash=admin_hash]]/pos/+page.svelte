<script lang="ts">
	import { MultiSelect } from 'svelte-multiselect';
	export let data;

	let selectedTags =
		data.posTouchTag?.map((tagId) => ({
			value: tagId,
			label: data.tags.find((tag) => tag._id === tagId)?.name ?? tagId
		})) ?? [];

	$: serializedTags = JSON.stringify(selectedTags.map((tag) => tag.value));
</script>

<h1 class="text-3xl">POS</h1>

<form method="post" class="flex flex-col gap-6">
	<!-- svelte-ignore a11y-label-has-associated-control -->
	<label class="form-label">
		Product Tags
		<MultiSelect
			--sms-options-bg="var(--body-mainPlan-backgroundColor)"
			options={data.tags.map((tag) => ({
				value: tag._id,
				label: tag.name
			}))}
			bind:selected={selectedTags}
		/>
	</label>
	<input type="hidden" name="posTouchTag" bind:value={serializedTags} />
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="posPrefillTermOfUse"
			class="form-checkbox"
			checked={data.posPrefillTermOfUse}
		/>
		Pre-fill term of use checkbox in /checkout
	</label>
	<input type="submit" value="Update" class="btn btn-blue self-start" />
</form>
