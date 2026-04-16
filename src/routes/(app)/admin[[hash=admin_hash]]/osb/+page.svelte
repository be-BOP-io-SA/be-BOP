<script lang="ts">
	export let data;
</script>

<h1 class="text-3xl">OSB</h1>

<form class="contents" method="post" action="?/save">
	<label class="form-label">
		Shop ID
		<input class="form-input" type="text" name="shopId" value={data.osb.shopId} required />
	</label>

	<label class="form-label">
		REST API Password
		<input class="form-input" type="password" name="password" value={data.osb.password} required />
	</label>

	<label class="form-label">
		HMAC-SHA-256 Key (optional)
		<input class="form-input" type="password" name="hmacKey" value={data.osb.hmacKey} />
	</label>

	<p class="text-sm text-gray-500">Currency: XPF (fixed)</p>

	<div class="flex justify-between">
		<button class="btn btn-black" type="submit">Save</button>
		<button class="btn btn-red" type="submit" form="delete-form">Reset</button>
	</div>
</form>
<form class="contents" method="post" action="?/delete" id="delete-form"></form>
