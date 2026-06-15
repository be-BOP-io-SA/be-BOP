<script lang="ts">
	import { useI18n } from '$lib/i18n';
	import IconCross from '$lib/components/icons/IconCross.svelte';
	import Picture from '$lib/components/Picture.svelte';
	import type { Picture as PictureType } from '$lib/types/Picture';

	type ProductBadge = {
		slug: string;
		name: string;
		price: { amount: number; currency: string };
		picture: PictureType | null;
	};
	type RequestedItem = {
		slug: string;
		quantity: number;
		product: ProductBadge | null;
	};
	type AddError = {
		slug: string;
		key: string;
		params?: Record<string, string | number>;
		product: ProductBadge | null;
	};

	export let state:
		| { mode: 'confirm'; requested: RequestedItem[] }
		| { mode: 'reconcile'; requested: RequestedItem[] }
		| { mode: 'errors'; errors: AddError[]; snapshot: string }
		| { mode: 'invalidUrl' };

	const { t } = useI18n();
</script>

<div
	class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
	role="dialog"
	aria-modal="true"
	aria-labelledby="cart-from-url-title"
>
	<div
		class="bg-white shadow-[0_0_0_4px_rgba(0,0,0,0.8)] w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-auto flex flex-col relative"
	>
		<a href="/cart" class="absolute top-2 right-2 p-2 z-10" aria-label={t('cartFromUrl.close')}>
			<IconCross />
		</a>

		{#if state.mode === 'confirm'}
			<div class="px-4 sm:px-6 py-4 border-b border-gray-200 pr-12">
				<h2 id="cart-from-url-title" class="text-xl sm:text-2xl font-bold text-gray-900">
					{t('cartFromUrl.confirm.title')}
				</h2>
			</div>

			<div class="px-4 sm:px-6 py-4 space-y-2 overflow-y-auto flex-grow">
				<div class="font-semibold text-gray-900">
					{t('cartFromUrl.proposedItems')}
				</div>
				{#each state.requested as item}
					<div
						class="flex items-center gap-3 p-2 border border-gray-200 rounded text-sm sm:text-base"
					>
						{#if item.product}
							<Picture
								picture={item.product.picture ?? undefined}
								class="w-12 h-12 sm:w-16 sm:h-16 rounded object-cover flex-shrink-0 border border-gray-200"
							/>
							<a
								href="/product/{item.slug}"
								target="_blank"
								rel="noopener"
								class="flex-grow truncate underline"
							>
								{item.product.name}
							</a>
						{:else}
							<span class="flex-grow truncate font-mono">{item.slug}</span>
						{/if}
						<span class="whitespace-nowrap">×{item.quantity}</span>
					</div>
				{/each}
			</div>

			<div
				class="px-4 sm:px-6 py-4 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3"
			>
				<a href="/cart" class="btn w-full body-secondaryCTA text-center">
					{t('cartFromUrl.confirm.cancel')}
				</a>
				<form method="POST" action="?/addFromUrl">
					{#each state.requested as item}
						<input type="hidden" name="slug" value={item.slug} />
						<input type="hidden" name="qty" value={item.quantity} />
					{/each}
					<button type="submit" class="btn w-full body-mainCTA">
						{t('cartFromUrl.confirm.cta')}
					</button>
				</form>
			</div>
		{:else if state.mode === 'reconcile'}
			<div class="px-4 sm:px-6 py-4 border-b border-gray-200 pr-12">
				<h2 id="cart-from-url-title" class="text-xl sm:text-2xl font-bold text-gray-900">
					{t('cartFromUrl.reconcile.title')}
				</h2>
				<p class="text-sm sm:text-base text-gray-600 mt-2">
					{t('cartFromUrl.reconcile.description')}
				</p>
			</div>

			<div class="px-4 sm:px-6 py-4 space-y-2 overflow-y-auto flex-grow">
				<div class="font-semibold text-gray-900">
					{t('cartFromUrl.proposedItems')}
				</div>
				{#each state.requested as item}
					<div
						class="flex items-center gap-3 p-2 border border-gray-200 rounded text-sm sm:text-base"
					>
						{#if item.product}
							<Picture
								picture={item.product.picture ?? undefined}
								class="w-12 h-12 sm:w-16 sm:h-16 rounded object-cover flex-shrink-0 border border-gray-200"
							/>
							<a
								href="/product/{item.slug}"
								target="_blank"
								rel="noopener"
								class="flex-grow truncate underline"
							>
								{item.product.name}
							</a>
						{:else}
							<span class="flex-grow truncate font-mono">{item.slug}</span>
						{/if}
						<span class="whitespace-nowrap">×{item.quantity}</span>
					</div>
				{/each}
			</div>

			<div
				class="px-4 sm:px-6 py-4 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3"
			>
				<form method="POST" action="?/replaceFromUrl">
					{#each state.requested as item}
						<input type="hidden" name="slug" value={item.slug} />
						<input type="hidden" name="qty" value={item.quantity} />
					{/each}
					<button type="submit" class="btn w-full body-mainCTA">
						{t('cartFromUrl.reconcile.replace')}
					</button>
				</form>
				<form method="POST" action="?/mergeFromUrl">
					{#each state.requested as item}
						<input type="hidden" name="slug" value={item.slug} />
						<input type="hidden" name="qty" value={item.quantity} />
					{/each}
					<button type="submit" class="btn w-full body-mainCTA">
						{t('cartFromUrl.reconcile.merge')}
					</button>
				</form>
				<a href="/cart" class="btn w-full body-secondaryCTA text-center">
					{t('cartFromUrl.reconcile.keep')}
				</a>
			</div>
		{:else if state.mode === 'errors'}
			<div class="px-4 sm:px-6 py-4 border-b border-gray-200 pr-12">
				<h2 id="cart-from-url-title" class="text-xl sm:text-2xl font-bold text-gray-900">
					{t('cartFromUrl.errors.title')}
				</h2>
			</div>

			<div class="px-4 sm:px-6 py-4 space-y-2 overflow-y-auto flex-grow">
				{#each state.errors as err}
					<div
						class="flex items-center gap-3 p-2 border border-red-200 rounded text-sm sm:text-base"
					>
						{#if err.product}
							<Picture
								picture={err.product.picture ?? undefined}
								class="w-12 h-12 sm:w-16 sm:h-16 rounded object-cover flex-shrink-0 border border-gray-200"
							/>
							<a
								href="/product/{err.slug}"
								target="_blank"
								rel="noopener"
								class="flex-grow truncate underline"
							>
								{err.product.name}
							</a>
						{:else}
							<span class="flex-grow truncate font-mono">{err.slug}</span>
						{/if}
						<span class="text-red-700 whitespace-nowrap">{t(err.key, err.params)}</span>
					</div>
				{/each}
			</div>

			<div
				class="px-4 sm:px-6 py-4 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3"
			>
				<a href="/cart" class="btn w-full body-secondaryCTA text-center">
					{t('cartFromUrl.errors.keepPartial')}
				</a>
				<form method="POST" action="?/clearAll">
					<button type="submit" class="btn w-full body-mainCTA">
						{t('cartFromUrl.errors.clearAll')}
					</button>
				</form>
				<form method="POST" action="?/rollbackNew">
					<input type="hidden" name="snapshot" value={state.snapshot} />
					<button type="submit" class="btn w-full body-mainCTA">
						{t('cartFromUrl.errors.rollbackNew')}
					</button>
				</form>
			</div>
		{:else}
			<div class="px-4 sm:px-6 py-4 border-b border-gray-200 pr-12">
				<h2 id="cart-from-url-title" class="text-xl sm:text-2xl font-bold text-gray-900">
					{t('cartFromUrl.errors.invalidUrl')}
				</h2>
			</div>
			<div class="px-4 sm:px-6 py-4 text-sm sm:text-base text-gray-700">
				{t('cartFromUrl.errors.invalidUrlDescription')}
			</div>
		{/if}
	</div>
</div>
