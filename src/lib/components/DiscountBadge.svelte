<script lang="ts">
	/**
	 * The red "-X%" pill shown next to a struck price.
	 *
	 * It was copy-pasted on every screen that strikes a price, and the copies drifted: the product
	 * page printed the percentage raw where the others rounded it. Here it is written once, so a
	 * discount of 12.345% reads the same wherever the customer meets it.
	 */
	export let percentage: number;
</script>

<span class="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
	>-{Number.isInteger(percentage) ? percentage : percentage.toFixed(1)}%</span
>
