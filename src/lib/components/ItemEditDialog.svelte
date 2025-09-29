<script lang="ts">
	import type { CartItemFrontend } from '../../routes/(app)/+layout.server';
	import { DEFAULT_MAX_QUANTITY_PER_ORDER } from '$lib/types/Product';

	export let item: CartItemFrontend;
	export let onClose: () => void;
	export let onUpdateNote: (note: string) => Promise<void>;
	export let onUpdateQuantity: (quantity: number) => Promise<void>;

	let note = item.internalNote?.value || '';
	let quantity = item.quantity;
	let noteInput: HTMLTextAreaElement;

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
		if (quantity !== item.quantity) {
			await onUpdateQuantity(quantity);
		}
		if (note !== (item.internalNote?.value || '')) {
			await onUpdateNote(note);
		}
		onClose();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			onClose();
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
	on:click={onClose}
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
				on:click={onClose}
				aria-label="Close dialog"
			>
				×
			</button>
		</div>

		<!-- Content -->
		<div class="px-6 py-6 space-y-6">
			<!-- Quantity Section -->
			<div class="space-y-4">
				<div class="block text-xl font-semibold text-gray-900">Quantité</div>

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
							Sélection directe:
						</label>
						<select
							id="quantity-select"
							class="touchScreen-product-secondaryCTA text-2xl px-4 py-3 min-w-[5rem] text-center"
							value={quantity}
							on:change={handleQuantitySelect}
						>
							<option value={0}>0 (Supprimer)</option>
							{#each Array.from({ length: maxQuantity }, (_, i) => i + 1) as num}
								<option value={num}>{num}</option>
							{/each}
						</select>
					</div>
				</div>

				<!-- Status Display -->
				{#if quantity === 0}
					<div class="text-center text-red-600 text-xl font-bold">Article supprimé</div>
				{/if}
			</div>

			<!-- Note Section -->
			<div class="space-y-4">
				<label for="note-input" class="block text-xl font-semibold text-gray-900">
					Commentaire
				</label>
				<textarea
					id="note-input"
					bind:this={noteInput}
					bind:value={note}
					placeholder="Entrez un commentaire..."
					class="w-full h-24 text-lg border border-gray-300 px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				></textarea>
			</div>
		</div>

		<!-- Footer -->
		<div class="px-6 py-4 border-t border-gray-200 grid grid-cols-2 gap-4">
			<button
				type="button"
				class="touchScreen-action-secondaryCTA text-3xl p-4 text-center"
				on:click={onClose}
			>
				ANNULER
			</button>
			<button
				type="submit"
				class="touchScreen-action-cta text-3xl p-4 text-center"
				on:click={saveChanges}
			>
				VALIDER
			</button>
		</div>
	</form>
</div>
