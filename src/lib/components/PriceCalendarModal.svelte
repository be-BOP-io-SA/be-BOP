<script lang="ts">
	import PriceHistoryView from './PriceHistoryView.svelte';
	import { useI18n } from '$lib/i18n';

	export let open = false;
	export let productId: string;
	export let productName: string;
	export let currency = '';
	export let onClose: () => void = () => {};
	export let showHistory = true;
	export let showPaid = false;
	export let vatMult = 1;
	export let adminOrderHref = '';

	const { t } = useI18n();
</script>

<svelte:window
	on:keydown={(e) => {
		if (open && e.key === 'Escape') {
			onClose();
		}
	}}
/>

{#if open}
	<div class="fixed inset-0 z-[1000] flex items-center justify-center p-4">
		<button
			type="button"
			class="absolute inset-0 bg-black/50"
			aria-label={t('priceCalendar.close')}
			on:click={onClose}
		/>
		<div
			class="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
			role="dialog"
			aria-modal="true"
		>
			<!-- Header -->
			<div class="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
				<span class="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-500">
					<svg
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
					</svg>
				</span>
				<h2 class="flex-1 truncate text-lg font-semibold text-gray-900">{productName}</h2>
				<button
					type="button"
					class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100"
					aria-label={t('priceCalendar.close')}
					on:click={onClose}
				>
					<svg
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path d="M6 6l12 12M18 6L6 18" />
					</svg>
				</button>
			</div>

			<div class="flex-1 overflow-y-auto px-5 pb-5">
				<PriceHistoryView
					{productId}
					{currency}
					active={open}
					{showHistory}
					{showPaid}
					{vatMult}
					{adminOrderHref}
				/>
			</div>

			<!-- Footer -->
			<div class="flex justify-end border-t border-gray-100 px-5 py-4">
				<button
					type="button"
					class="rounded-lg bg-blue-500 px-5 py-2 text-sm font-medium text-white hover:bg-blue-600"
					on:click={onClose}
				>
					{t('priceCalendar.close')}
				</button>
			</div>
		</div>
	</div>
{/if}
