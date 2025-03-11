<script lang="ts">
	import GoalProgress from './GoalProgress.svelte';
	import { useI18n } from '$lib/i18n';
	import type { Leaderboard } from '$lib/types/Leaderboard';
	import type { Product } from '$lib/types/Product';
	import type { Picture } from '$lib/types/Picture';
	import { groupBy } from 'lodash-es';
	import type { SetRequired } from 'type-fest';
	import PictureComponent from './Picture.svelte';

	let className = '';
	export { className as class };
	export let leaderboard: Pick<
		Leaderboard,
		'_id' | 'name' | 'progress' | 'endsAt' | 'mode' | 'beginsAt'
	>;
	export let products: Pick<Product, '_id' | 'name' | 'shortDescription'>[];
	export let pictures: Picture[];
	const { locale } = useI18n();
	$: productById = Object.fromEntries(products.map((product) => [product._id, product]));
	$: picturesByProduct = groupBy(
		pictures.filter((picture): picture is SetRequired<Picture, 'productId'> => !!picture.productId),
		'productId'
	);
	leaderboard.progress.sort((a, b) => b.amount - a.amount);
</script>

{#each leaderboard.progress as progress}
	<div class="flex items-center {className}">
		<div class="flex items-center flex-row gap-4">
			<a href="/product/{progress.productId}" target="_blank">
				<PictureComponent
					picture={picturesByProduct[productById[progress.productId]._id][0]}
					class="max-w-[68px] max-h-[68px]"
				/>
			</a>
			<div class="flex flex-col">
				<a
					href="/product/{progress.productId}"
					class="font-medium text-[22px] body-title"
					target="_blank"
				>
					{productById[progress.productId].name}
				</a>
				<p class="hidden lg:contents">{productById[progress.productId].shortDescription}</p>
			</div>
		</div>
	</div>
	<GoalProgress
		class="font-bold body-title"
		text={leaderboard.mode === 'moneyAmount'
			? Number(Math.max(0, progress.amount))
					.toLocaleString($locale, {
						style: 'currency',
						currency: progress.currency,
						minimumFractionDigits: 0
					})
					.toString()
			: Math.max(progress.amount, 0).toString()}
		goal={leaderboard.progress[0].amount}
		progress={progress.amount}
		leaderboard={true}
	/>
{/each}
