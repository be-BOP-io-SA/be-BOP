<script lang="ts">
	import IconStandBy from '$lib/components/icons/IconStandBy.svelte';
	import type { ActionData } from './$types';
	export let form: ActionData;
</script>

<h1 class="text-2xl text-center">Password recovery</h1>
<div class="flex justify-center items-center">
	<form method="post" class="flex flex-col gap-4 p-6 w-[30em]">
		<div class="flex justify-center">
			<IconStandBy class="text-red-500" />
		</div>
		<label class="form-label">
			<input
				class="form-input"
				type="text"
				name="login"
				value={form?.login ?? ''}
				placeholder="Enter admin login"
			/>
		</label>
		<div class="flex-wrap text-center">
			{#if !form?.success}
				<p>
					A password reset email will be sent to either the user's recovery information or the
					shop's email address.
				</p>
			{/if}
			{#if form?.success}
				<p class="text-green-500">
					If this login exists, a password reset link was sent to its recovery email or npub, or to
					the shop's email address.
				</p>
			{/if}
		</div>
		<div class="flex justify-center gap-4 mt-2">
			<input type="submit" class="btn btn-red text-white" value="Reset" />
		</div>
	</form>
</div>
