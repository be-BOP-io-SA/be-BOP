<script lang="ts">
	import { enhance } from '$app/forms';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();
</script>

<!-- Cancels this payment and takes the same sale again, at the choice of the method. -->
<form method="post" action="?/cancel" class="w-full max-w-sm" use:enhance>
	<input type="hidden" name="substitute" value="1" />
	<button type="submit" class="btn pos-secondary w-full text-xl py-4">
		{t('pos.terminal.changeMethod')}
	</button>
</form>
