<script lang="ts">
	export let data;
</script>

<h1 class="text-3xl">Theme</h1>
<a href="{data.adminPrefix}/theme/new" class="underline">Create a new theme</a>

<h2 class="text-2xl">Choose your theme</h2>
<form method="post" class="flex flex-col gap-6">
	<label class="form-label">
		Main theme
		<select name="mainTheme" class="form-input max-w-[25rem]" bind:value={data.themeId}>
			<option value="">Default theme</option>
			{#each data.themes as theme}
				<option value={theme._id}>{theme.name}</option>
			{/each}
		</select>
	</label>
	<label class="checkbox-label">
		<input
			type="checkbox"
			id="hideThemeSelectorInToolbar"
			name="hideThemeSelectorInToolbar"
			class="form-checkbox"
			checked={data.hideThemeSelectorInToolbar}
		/>
		Hide theme selector in toolbar
	</label>
	<input type="submit" value="Update" class="btn btn-blue self-start" />
</form>

{#if data.themes.length}
	<h2 class="text-2xl">Theme list :</h2>
	{#each data.themes as theme}
		<a href="{data.adminPrefix}/theme/{theme._id}" class="font-semibold underline">{theme.name}</a>
	{/each}
{/if}
