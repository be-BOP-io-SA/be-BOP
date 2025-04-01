<script lang="ts">
	import { useI18n } from '$lib/i18n.js';
	import { MIN_PASSWORD_LENGTH, checkPasswordPwnedTimes } from '$lib/types/User.js';

	export let form;
	export let data;

	let rememberOption = false;
	const rememberDates = [
		{
			option: '1 hour',
			value: 3600
		},
		{
			option: '1 day',
			value: 86400
		},
		{
			option: '1 week',
			value: 86400 * 7
		},
		{
			option: '1 month',
			value: 86400 * 30
		},
		{
			option: 'As much as possible',
			value: 10 * 365 * 86400
		}
	];
	let errorMessage = '';

	let passwordInput: HTMLInputElement | null = null;
	let formElement: HTMLFormElement | null = null;

	const { t, locale } = useI18n();

	async function checkPassword() {
		errorMessage = '';
		const password = passwordInput?.value;
		if (!password) {
			return;
		}

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

<div class="flex justify-center items-center">
	<form
		method="post"
		class="flex-col gap-4 p-6 w-[30em]"
		bind:this={formElement}
		on:submit|preventDefault={checkPassword}
	>
		<label class="form-label">
			Login
			<input
				class="form-input"
				type="text"
				name="login"
				placeholder="Enter your login"
				value={form?.login ?? ''}
				required
				disabled={!!form?.disabledUser}
			/>
		</label>
		<label class="form-label">
			Password
			<input
				class="form-input"
				type="password"
				name="password"
				minlength={MIN_PASSWORD_LENGTH}
				bind:this={passwordInput}
				placeholder="Enter your password"
				required
				disabled={!!form?.disabledUser}
			/>
		</label>
		<div class="flex flex-row gap-4 mt-2 justify-between">
			<label class="checkbox-label">
				<input
					class="form-checkbox"
					type="checkbox"
					name="remember"
					bind:checked={rememberOption}
				/>
				Remember me
			</label>
			<select
				name="memorize"
				class="form-input w-[15em] {rememberOption ? '' : 'hidden sm-inline'}"
			>
				{#each rememberDates as rememberDate}
					<option value={rememberDate.value}>{rememberDate.option} </option>
				{/each}
			</select>
		</div>
		{#if form?.incorrect || errorMessage}
			<p class="text-red-500">{errorMessage || 'Invalid credentials, please try again'}</p>
		{/if}
		{#if form?.disabledUser}
			<p class="text-red-500">{form.disabledUser}</p>
		{/if}
		<div class="flex justify-center gap-4 mt-2">
			<input
				type="submit"
				class="btn btn-blue text-white"
				value={data.isAdminCreated ? 'Login' : 'Create Super Admin'}
				disabled={!!form?.disabledUser}
			/>
			{#if data.isAdminCreated}
				<a href="{data.adminPrefix}/login/recovery" class="btn btn-gray">Recovery</a>
			{/if}
		</div>
	</form>
</div>
