<script lang="ts">
	import { enhance } from '$app/forms';
	import { useI18n } from '$lib/i18n';

	export let data;
	export let form;

	const { t } = useI18n();

	let testInFlight = false;
	let testCooldownUntil = 0;
	$: testDisabled = testInFlight || Date.now() < testCooldownUntil;
</script>

<h1 class="text-3xl">OSB</h1>

<form class="contents" method="post" action="?/save">
	<label class="form-label">
		{t('admin.osb.shopId')}
		<input class="form-input" type="text" name="shopId" value={data.osb.shopId} required />
	</label>

	<label class="form-label">
		{t('admin.osb.restApiPassword')}
		<input class="form-input" type="password" name="password" value={data.osb.password} required />
	</label>

	<label class="form-label">
		{t('admin.osb.hmacKeyOptional')}
		<input class="form-input" type="password" name="hmacKey" value={data.osb.hmacKey} />
	</label>

	<p class="text-sm text-gray-500">{t('admin.osb.currencyFixed')}</p>

	<div class="flex justify-between">
		<button class="btn btn-black" type="submit">Save</button>
		<button class="btn btn-red" type="submit" form="delete-form">Reset</button>
	</div>
</form>
<form class="contents" method="post" action="?/delete" id="delete-form"></form>

<form
	method="post"
	action="?/testConnection"
	use:enhance={() => {
		testInFlight = true;
		return async ({ update }) => {
			await update({ reset: false });
			testInFlight = false;
			testCooldownUntil = Date.now() + 10_000;
		};
	}}
	class="flex flex-col gap-2"
>
	<button class="btn btn-blue self-start" type="submit" disabled={testDisabled}>
		{testInFlight ? 'Testing…' : 'Test connection'}
	</button>
	{#if form?.ok}
		<div class="alert-success">Connection successful. OSB credentials are working.</div>
	{:else if form?.reason}
		<div class="alert-error">Connection failed: {form.reason}</div>
	{/if}
</form>
