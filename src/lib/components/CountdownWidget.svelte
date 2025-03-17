<script lang="ts">
	import type { Countdown } from '$lib/types/Countdown';
	import { differenceInMilliseconds } from 'date-fns';
	import { onMount } from 'svelte';

	let className = '';
	export { className as class };
	export let countdown: Pick<Countdown, '_id' | 'title' | 'description' | 'endsAt'>;
	let endsAt = countdown.endsAt;
	$: distance = differenceInMilliseconds(endsAt.toISOString(), new Date(new Date().toISOString()));
	function updateCountdown() {
		distance = Math.max(differenceInMilliseconds(endsAt, new Date()), 0);
	}
	onMount(() => {
		const interval = setInterval(updateCountdown, 1000);
		return () => clearInterval(interval);
	});
</script>

<div class="flex flex-row gap-4 {className}">
	<div class="flex lg:flex-row flex-col w-full tagWidget tagWidget-main grow pr-5">
		<div class="p-4 grow">
			<h2 class="text-2xl font-bold mb-2 body-title">
				{countdown.title}
			</h2>

			<p class="mb-4">{countdown.description}</p>
		</div>

		<div class="grow-[2] flex flex-row gap-4 p-4 lg:justify-normal justify-end">
			{#each ['DAYS', 'HOURS', 'MINS', 'SECS'] as unit (unit)}
				<div class="flex flex-col">
					<span class="text-3xl font-bold body-title">
						{Math.floor(
							unit === 'DAYS'
								? distance / (1000 * 60 * 60 * 24)
								: unit === 'HOURS'
								? (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
								: unit === 'MINS'
								? (distance % (1000 * 60 * 60)) / (1000 * 60)
								: (distance % (1000 * 60)) / 1000
						)}
					</span>
					{unit}
				</div>
			{/each}
		</div>
	</div>
</div>
