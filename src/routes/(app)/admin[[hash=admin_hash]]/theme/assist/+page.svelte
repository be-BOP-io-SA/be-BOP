<script lang="ts">
	import { systemFonts } from '$lib/types/Theme';
</script>

<h1 class="text-3xl">Create a new theme (with assistant)</h1>

<form method="post" class="flex flex-col gap-6 max-w-lg">
	<label class="form-label">
		Theme name
		<input class="form-input" type="text" name="name" required />
	</label>

	<label class="form-label">
		Primary color (header, footer, main CTAs)
		<input class="form-input" type="color" name="primaryColor" value="#00470b" required />
	</label>

	<label class="form-label">
		Secondary color (navbar, secondary CTAs)
		<input class="form-input" type="color" name="secondaryColor" value="#240000" required />
	</label>

	<label class="form-label">
		Main font
		<select class="form-input" name="mainFont" required>
			{#each systemFonts as font}
				<option value={font}>{font}</option>
			{/each}
		</select>
	</label>

	<label class="form-label">
		Secondary font (optional - for titles)
		<select class="form-input" name="secondaryFont">
			<option value="">Same as main font</option>
			{#each systemFonts as font}
				<option value={font}>{font}</option>
			{/each}
		</select>
	</label>

	<input type="submit" class="btn btn-blue self-start" value="Generate theme" />
</form>
