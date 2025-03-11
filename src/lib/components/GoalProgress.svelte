<script lang="ts">
	export let text: string;
	export let goal: number;
	export let progress: number;
	export let leaderboard = false;
	let className = '';
	export { className as class };

	$: percentage = goal !== 0 ? (progress * 100) / goal : 0;
	$: newPercentage = (goal * 100) / progress;
</script>

<div class="relative mt-6 pt-6 {className}">
	<div
		class="absolute inset-0 rounded-[3px] flex justify-end {percentage > 100
			? 'bg-green-500'
			: 'bg-gradient-to-r from-red-500 to-green-500 via-yellow-500'}"
	>
		{#if percentage <= 100}
			<div
				data-text={text}
				style="background-position: {percentage}% 0%"
				class="-mt-6 h-6 bg-[length:100px_50px] bg-gradient-to-r from-red-500 to-green-500 via-yellow-500 w-[2px] relative before:content-[attr(data-text)] before:text-gray-800 before:absolute {percentage <
				50
					? 'before:left-[6px]'
					: 'before:right-1'} before:-top-1 before:text-base before:whitespace-nowrap"
			/>

			<div
				class="h-6 bg-gradient-to-b from-gray-250 to-white to-45% border border-l-0 border-gray-360 rounded-r-[3px]"
				style="width: {100 - percentage}%"
			/>
		{/if}
	</div>
	<div
		class="absolute inset-0 rounded-[3px] flex justify-end {percentage >= 100
			? leaderboard
				? 'bg-gradient-to-r from-red-500 to-green-500 via-yellow-500'
				: 'bg-green-500'
			: ''}"
		style={percentage >= 100 ? `width: calc(${Math.round(newPercentage)}%);` : ''}
	>
		{#if percentage > 100}
			<div
				data-text="🎯"
				style="background-position: {percentage}% 0%"
				class="bg-[length:100px_50px] w-[2px] relative before:content-[attr(data-text)] before:text-white items-center before:absolute {percentage <
				50
					? 'before:left-[6px]'
					: 'before:right-1'} before:-top-1 before:text-base before:whitespace-nowrap"
			/>
		{/if}
	</div>
</div>
