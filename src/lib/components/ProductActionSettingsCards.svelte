<script lang="ts">
	export let eshopVisible: boolean;
	export let retailVisible: boolean;
	export let googleShoppingVisible: boolean;
	export let nostrVisible: boolean;
	export let eshopBasket: boolean;
	export let retailBasket: boolean;
	export let nostrBasket: boolean;
</script>

<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
	<div class="border border-gray-300 rounded p-3 bg-white flex flex-col gap-2">
		<h4 class="font-semibold text-sm">Eshop (anyone)</h4>
		<label class="checkbox-label text-sm">
			<input
				type="checkbox"
				class="form-checkbox"
				name="eshopVisible"
				bind:checked={eshopVisible}
			/>
			Product is visible
		</label>
		<label class="checkbox-label text-sm">
			<input type="checkbox" class="form-checkbox" name="eshopBasket" bind:checked={eshopBasket} />
			Can be added to basket
		</label>
	</div>
	<div class="border border-gray-300 rounded p-3 bg-white flex flex-col gap-2">
		<h4 class="font-semibold text-sm">Retail (POS logged seat)</h4>
		<label class="checkbox-label text-sm">
			<input
				type="checkbox"
				class="form-checkbox"
				name="retailVisible"
				bind:checked={retailVisible}
			/>
			Product is visible
		</label>
		<label class="checkbox-label text-sm">
			<input
				type="checkbox"
				class="form-checkbox"
				name="retailBasket"
				bind:checked={retailBasket}
			/>
			Can be added to basket
		</label>
	</div>
	<div class="border border-gray-300 rounded p-3 bg-white flex flex-col gap-2">
		<h4 class="font-semibold text-sm">Google Shopping</h4>
		<label class="checkbox-label text-sm">
			<input
				type="checkbox"
				class="form-checkbox"
				name="googleShoppingVisible"
				bind:checked={googleShoppingVisible}
			/>
			Product is visible
		</label>
	</div>
	<div class="border border-gray-300 rounded p-3 bg-white flex flex-col gap-2">
		<h4 class="font-semibold text-sm">Nostr-bot</h4>
		<label class="checkbox-label text-sm">
			<input
				type="checkbox"
				class="form-checkbox"
				name="nostrVisible"
				bind:checked={nostrVisible}
			/>
			Product is visible
		</label>
		<label class="checkbox-label text-sm">
			<input type="checkbox" class="form-checkbox" name="nostrBasket" bind:checked={nostrBasket} />
			Can be added to basket
		</label>
	</div>
</div>
