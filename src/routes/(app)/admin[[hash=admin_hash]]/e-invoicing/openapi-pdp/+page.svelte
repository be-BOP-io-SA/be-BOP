<script lang="ts">
	import { enhance } from '$app/forms';

	export let data;
	export let form;

	let testInFlight = false;
	let testCooldownUntil = 0;
	$: testDisabled = testInFlight || Date.now() < testCooldownUntil;
</script>

<h1 class="text-3xl">OpenAPI PDP connection</h1>

<p class="text-sm">
	Connect to any accredited platform (PDP) exposing the common French e-invoicing OpenAPI shape
	(OAuth2 client_credentials + `/v1.beta/invoices`) — e.g. SUPER PDP's sandbox at
	<code>https://api.superpdp.tech</code>.
</p>

<form class="contents" method="post" action="?/save">
	<label class="form-label">
		Base URL
		<input
			class="form-input"
			type="url"
			name="baseUrl"
			placeholder="https://api.superpdp.tech"
			value={data.openApiPdp.baseUrl}
			required
		/>
	</label>

	<label class="form-label">
		Client ID
		<input
			class="form-input"
			type="text"
			name="clientId"
			value={data.openApiPdp.clientId}
			required
		/>
	</label>

	<label class="form-label">
		Client secret
		<input
			class="form-input"
			type="password"
			name="clientSecret"
			value={data.openApiPdp.clientSecret}
			required
		/>
	</label>

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
		<div class="alert-success">Connection successful. PDP credentials are working.</div>
	{:else if form?.reason}
		<div class="alert-error">Connection failed: {form.reason}</div>
	{/if}
</form>
