<script lang="ts">
	import type { Challenge } from '$lib/types/Challenge';
	import GoalProgress from './GoalProgress.svelte';
	import PriceTag from './PriceTag.svelte';
	import { useI18n } from '$lib/i18n';
	import Trans from './Trans.svelte';

	let className = '';
	export { className as class };
	export let challenge: Pick<
		Challenge,
		'_id' | 'name' | 'goal' | 'progress' | 'endsAt' | 'mode' | 'beginsAt'
	>;

	const { t, locale } = useI18n();
</script>

<div class="rounded p-4 flex flex-col {className}">
	<div class="flex justify-between items-center">
		<h3 class="font-medium text-[22px] body-title">
			{challenge.name}
		</h3>
		<span class="text-base font-light body-secondaryText"
			>{#if challenge.beginsAt > new Date()}
				{t('challenge.beginsAt', {
					days: Math.floor(
						(challenge.beginsAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
					)
				})}
			{:else if challenge.endsAt < new Date()}
				{t('challenge.ended')}
			{:else}
				<Trans key="challenge.endsAt">
					<time
						datetime={challenge.endsAt.toJSON()}
						slot="0"
						title={challenge.endsAt.toLocaleString($locale)}
					>
						{challenge.endsAt.toLocaleDateString($locale)}
					</time>
					<time
						datetime={challenge.endsAt.toJSON()}
						slot="1"
						title={challenge.endsAt.toLocaleString($locale)}
					>
						{challenge.endsAt.toLocaleTimeString($locale, { minute: '2-digit', hour: '2-digit' })}
					</time>
				</Trans>
			{/if}
		</span>
	</div>
	<GoalProgress
		class="font-bold mt-3 body-title"
		text={challenge.mode === 'moneyAmount'
			? Number(Math.max(0, challenge.progress))
					.toLocaleString($locale, {
						style: 'currency',
						currency: challenge.goal.currency,
						minimumFractionDigits: 0
					})
					.toString()
			: Math.max(challenge.progress, 0).toString()}
		goal={challenge.goal.amount}
		progress={challenge.progress}
	/>
	<div class="flex justify-between mt-1 items-right">
		<!-- <a href="/" class="body-hyperlink underline">How can I contribute?</a> -->
		<p></p>
		{#if challenge.progress === challenge.goal.amount}
			<p>{t('challenge.goalMet')}</p>
		{:else if challenge.progress > challenge.goal.amount && challenge.mode === 'moneyAmount' && challenge.goal.currency}
			<div class="flex flex-row body-secondaryText gap-1">
				<Trans key="challenge.moneyAmount.goalOvershot">
					<PriceTag
						amount={challenge.progress}
						class="text-gray-800 text-base"
						currency={challenge.goal.currency}
						main
						slot="0"
					/>
					<PriceTag
						amount={challenge.goal.amount}
						class="text-gray-800 text-base"
						currency={challenge.goal.currency}
						main
						slot="1"
					/>
				</Trans>
			</div>
		{:else if challenge.progress > challenge.goal.amount && !challenge.goal.currency}
			<div class="flex flex-row body-secondaryText gap-1">
				{t('challenge.totalProducts.goalOvershot', {
					progress: challenge.progress.toLocaleString($locale),
					goal: challenge.goal.amount.toLocaleString($locale)
				})}
			</div>
		{:else if challenge.goal.currency}
			<PriceTag
				amount={challenge.goal.amount}
				class="text-gray-800 text-base"
				currency={challenge.goal.currency}
				main
			/>
		{:else}
			{t('challenge.numProducts', { count: challenge.goal.amount })}
		{/if}
	</div>
</div>
