<script lang="ts">
	import OrderSummary from '$lib/components/OrderSummary.svelte';
	import Trans from '$lib/components/Trans.svelte';
	import { useI18n } from '$lib/i18n';

	export let data;

	const { t, locale } = useI18n();
</script>

<main class="mx-auto max-w-7xl py-10 px-6 body-mainPlan">
	<div
		class="w-full rounded-xl body-mainPlan border-gray-300 p-6 grid flex md:grid-cols-3 sm:flex-wrap gap-2"
	>
		<div class="col-span-2 flex flex-col gap-2">
			<a href="/order/{data.order._id}" class="body-hyperlink hover:underline"
				>&lt;&lt; {t('order.note.backToOrder')}
			</a>
			<h1 class="text-3xl body-title">{t('order.note.title', { number: data.order.number })}</h1>
			<p class="text-base">
				<Trans key="order.createdAt"
					><time
						datetime={data.order.createdAt.toJSON()}
						title={data.order.createdAt.toLocaleString($locale)}
						slot="0">{data.order.createdAt.toLocaleString($locale)}</time
					></Trans
				>
			</p>
			<br />
			{#each data.order.notes as note}
				{note.isSystem
					? t('order.note.authorSystem')
					: note.isEmployee
					? t('order.note.author', { alias: note.alias })
					: t('order.note.authorCustomer')}<br />
				<p class="text-base">
					<time datetime={note.createdAt.toJSON()} title={note.createdAt.toLocaleString($locale)}
						>{note.createdAt.toLocaleString($locale)}</time
					>
				</p>
				<textarea
					name="noteContent"
					cols="30"
					rows="2"
					class="form-input"
					readonly
					value={note.content}
				/>
			{/each}
		</div>

		<div class="">
			<OrderSummary
				class="sticky top-4 -mr-2 -mt-2"
				order={data.order}
				orderPriceInfo={data.priceInfoProbablyIncorrectBuyOkayForDisplay}
			/>
		</div>
	</div>
</main>
