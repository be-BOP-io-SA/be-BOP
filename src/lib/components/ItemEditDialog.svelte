<script lang="ts">
	import { DEFAULT_MAX_QUANTITY_PER_ORDER } from '$lib/types/Product';
	import { useI18n } from '$lib/i18n';

	export let item: {
		internalNote?: { value: string };
		quantity: number;
		product: { name: string; maxQuantityPerOrder?: number };
	};
	export let onClose: (_: { note?: string; quantity?: number }) => Promise<void>;
	export let errorMessage = '';

	let note = item.internalNote?.value || '';
	let quantity = item.quantity;
	let noteInput: HTMLTextAreaElement;

	const { t } = useI18n();

	$: maxQuantity = item.product.maxQuantityPerOrder ?? DEFAULT_MAX_QUANTITY_PER_ORDER;

	// Focus the note input when the dialog opens
	$: if (noteInput) {
		noteInput.focus();
	}

	function increaseQuantity() {
		quantity = Math.min(quantity + 1, maxQuantity);
	}

	function decreaseQuantity() {
		quantity = Math.max(quantity - 1, 0); // Allow 0 to remove item
	}

	function handleQuantitySelect(event: Event) {
		const target = event.target as HTMLSelectElement;
		quantity = parseInt(target.value);
	}

	async function saveChanges() {
		const payload: Parameters<typeof onClose>[0] = {};
		if (quantity !== item.quantity) {
			payload.quantity = quantity;
		}
		if (note !== (item.internalNote?.value || '')) {
			payload.note = note;
		}
		await onClose(payload);
	}

	async function cancel() {
		await onClose({});
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			cancel();
		}
		if (event.key === 'Enter' && event.ctrlKey) {
			saveChanges();
		}
	}
</script>

<!-- Backdrop -->
<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
	class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
	on:click={cancel}
	role="dialog"
	tabindex="-1"
	aria-modal="true"
	aria-labelledby="dialog-title"
>
	<!-- Dialog content -->
	<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
	<form
		class="bg-white shadow-[0_0_0_4px_rgba(0,0,0,0.8)] max-w-2xl w-full max-h-[90vh] overflow-auto"
		on:click|stopPropagation
		on:keydown|stopPropagation={handleKeydown}
		on:submit|preventDefault={saveChanges}
		role="dialog"
		tabindex="-1"
	>
		<!-- Header -->
		<div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
			<h2 id="dialog-title" class="text-2xl font-bold text-gray-900">
				{item.quantity} X {item.product.name.toUpperCase()}
			</h2>
			<button
				type="button"
				class="touchScreen-action-secondaryCTA text-2xl p-2 px-4 leading-none"
				on:click={cancel}
				aria-label="Close dialog"
			>
				×
			</button>
		</div>

		<!-- Content -->
		<div class="px-6 py-6 space-y-6">
			<!-- Quantity Section -->
			<div class="space-y-4">
				<div class="block text-xl font-semibold text-gray-900">{t('pos.itemEdit.quantity')}</div>

				<!-- Quantity Controls -->
				<div class="flex items-center space-x-4">
					<!-- Decrease Button -->
					<button
						type="button"
						class="touchScreen-product-secondaryCTA w-16 h-16 text-3xl flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
						disabled={quantity <= 0}
						on:click={decreaseQuantity}
					>
						−
					</button>

					<!-- Quantity Display -->
					<div class="text-4xl font-bold text-center min-w-[4rem]p-2">
						{quantity}
					</div>

					<!-- Increase Button -->
					<button
						type="button"
						class="touchScreen-product-secondaryCTA w-16 h-16 text-3xl flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
						disabled={quantity >= maxQuantity}
						on:click={increaseQuantity}
					>
						+
					</button>

					<!-- Growing Spacer -->
					<div class="flex-1"></div>

					<!-- Direct Quantity Select -->
					<div>
						<label for="quantity-select" class="block text-sm text-gray-600 mb-1">
							{t('pos.itemEdit.directSelection')}:
						</label>
						<select
							id="quantity-select"
							class="touchScreen-product-secondaryCTA text-2xl px-4 py-3 min-w-[5rem] text-center"
							value={quantity}
							on:change={handleQuantitySelect}
						>
							<option value={0}>{t('pos.itemEdit.qtyZeroRemove')}</option>
							{#each Array.from({ length: maxQuantity }, (_, i) => i + 1) as num}
								<option value={num}>{num}</option>
							{/each}
						</select>
					</div>
				</div>

				<!-- Status Display -->
				{#if quantity === 0}
					<div class="text-center text-red-600 text-xl font-bold">
						{t('pos.itemEdit.itemRemoved')}
					</div>
				{/if}
			</div>

			<!-- Note Section -->
			<div class="space-y-4">
				<label for="note-input" class="block text-xl font-semibold text-gray-900">
					{t('pos.itemEdit.comment')}
				</label>
				<textarea
					id="note-input"
					bind:this={noteInput}
					bind:value={note}
					placeholder={t('pos.itemEdit.commentPlaceholder')}
					class="w-full h-24 text-lg border border-gray-300 px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				></textarea>
			</div>
		</div>

		{#if errorMessage}
			<div class="bg-red-100 border-2 border-red-400 p-3 mx-6 rounded">
				<p class="text-red-600 text-xl text-center font-bold">{errorMessage}</p>
			</div>
		{/if}

		<!-- Footer -->
		<div class="px-6 py-4 border-t border-gray-200 grid grid-cols-2 gap-4">
			<button
				type="button"
				class="touchScreen-action-secondaryCTA text-3xl p-4 text-center"
				on:click={cancel}
			>
				{t('pos.itemEdit.cancel')}
			</button>
			<button
				type="button"
				class="touchScreen-action-cta text-3xl p-4 text-center"
				on:click={saveChanges}
			>
				{t('pos.itemEdit.save')}
			</button>
		</div>
	</form>
</div>
