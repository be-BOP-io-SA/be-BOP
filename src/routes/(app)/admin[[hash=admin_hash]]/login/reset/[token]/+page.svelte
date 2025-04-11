<script lang="ts">
	import IconStandBy from '$lib/components/icons/IconStandBy.svelte';
	import { useI18n } from '$lib/i18n';
	import { checkPasswordPwnedTimes } from '$lib/types/User.js';

	export let data;

	let password = '';
	let formElement: HTMLFormElement;
	let errorMessage = '';

	const { t, locale } = useI18n();

	async function handleSubmit(event: Event) {
		event.preventDefault();
		errorMessage = '';

		const pwnedTimes = await checkPasswordPwnedTimes(password);
		if (pwnedTimes) {
			errorMessage = t('login.password.pwned', {
				count: pwnedTimes.toLocaleString($locale)
			});
		} else {
			formElement?.submit();
		}
	}
</script>

<h1 class="text-2xl text-center">Password reset</h1>

<div class="flex justify-center">
	<IconStandBy class="text-green-500" />
</div>

<form
	method="post"
	class="flex flex-col mx-auto gap-4 max-w-xl"
	on:submit={handleSubmit}
	bind:this={formElement}
>
	<label class="form-label mb-1 max-w-sm mx-auto">
		<input
			class="form-input"
			type="text"
			name="login"
			placeholder="Enter other admin login"
			value={data.user?.login}
			disabled
		/>
		<input class="form-input" type="hidden" name="userId" value={data.user?._id} />
	</label>
	<label class="form-label mb-1 max-w-sm mx-auto">
		<input
			class="form-input"
			type="password"
			name="password"
			placeholder="Enter new password"
			minlength="8"
			bind:value={password}
		/>
	</label>
	<div class="flex-wrap text-center">
		{#if errorMessage}
			<p class="text-red-500">{errorMessage}</p>
		{/if}
	</div>
	<input type="submit" class="btn btn-blue text-white self-center" value="Update" />
</form>
