<script lang="ts">
	import { useI18n } from '$lib/i18n';

	/** Product page of a locked product: the cart would refuse it, so the widget sends there. */
	export let href: string;

	const { t } = useI18n();
</script>

<a {href} class="btn cartPreview-mainCTA">
	{t('product.cta.view')}
</a>
