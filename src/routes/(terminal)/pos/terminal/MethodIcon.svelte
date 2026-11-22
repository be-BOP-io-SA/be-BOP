<script lang="ts">
	import IconBolt from '~icons/ant-design/thunderbolt-outlined';
	import IconCard from '~icons/ant-design/credit-card-outlined';
	import IconPay from '~icons/ant-design/pay-circle-outlined';

	/** The mark of a payment method, drawn in the color of the button around it. */
	export let method: string;

	const glyph =
		'w-10 h-10 grid place-items-center rounded-full border-2 border-current text-2xl font-bold';
</script>

{#if method === 'lightning'}
	<IconBolt class="w-10 h-10" />
{:else if method === 'card'}
	<IconCard class="w-10 h-10" />
{:else if method === 'bitcoin'}
	<span class={glyph} aria-hidden="true">₿</span>
{:else if method === 'paypal'}
	<span class={glyph} aria-hidden="true">P</span>
{:else}
	<IconPay class="w-10 h-10" />
{/if}
