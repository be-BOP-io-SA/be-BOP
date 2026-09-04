<!--
	Storefront "VAT excluded" / "(HT)" mention next to a product price (issue #2679).
	Hidden when the shop is VAT-exempt and `hideVatMentionsWhenExempted` is on.
	Used by: product page, product widgets img-0..img-4, mobile product widget.
	Sibling display under the same flag: searchlist price-filter "TTC" suffix.
	NOT used by cart / checkout / order / receipt / POS — those keep their VAT wording.
-->
<script lang="ts">
	import { page } from '$app/stores';
	import { useI18n } from '$lib/i18n';

	/** `(HT)` short form used by the mobile widget instead of the full label */
	export let short = false;

	let className = '';
	export { className as class };

	const { t } = useI18n();
</script>

{#if !$page.data.hideVatMentions}
	<span class={className}>
		{short ? `(${t('product.horsTaxeShort')})` : t('product.vatExcluded')}
	</span>
{/if}
