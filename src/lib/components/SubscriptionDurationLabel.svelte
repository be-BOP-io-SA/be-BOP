<script lang="ts">
	import { useI18n } from '$lib/i18n';
	import type { SubscriptionDuration } from '$lib/types/SubscriptionDuration';

	export let duration: SubscriptionDuration;
	let className = '';
	export { className as class };

	const { t } = useI18n();
</script>

<span class="inline-flex items-center gap-1 text-sm text-gray-600 {className}">
	🔁 {t('product.subscriptionDuration.' + duration)}
</span>
