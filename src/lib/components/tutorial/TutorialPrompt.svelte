<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { useI18n } from '$lib/i18n';

	export let type: 'start' | 'resume' | 'rerun' | null = null;
	export let tutorialName: string = '';

	const { t } = useI18n();
	const dispatch = createEventDispatcher<{
		start: void;
		skip: void;
		resume: void;
		startOver: void;
	}>();

	function handleStart() {
		dispatch('start');
	}

	function handleSkip() {
		dispatch('skip');
	}

	function handleResume() {
		dispatch('resume');
	}

	function handleStartOver() {
		dispatch('startOver');
	}
</script>

{#if type}
	<!-- Backdrop -->
	<div class="fixed inset-0 bg-black bg-opacity-50 z-[9998]" />

	<!-- Modal -->
	<div
		class="fixed inset-0 flex items-center justify-center z-[9999] p-4"
		role="dialog"
		aria-modal="true"
	>
		<div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
			{#if type === 'start'}
				<h2 class="text-xl font-bold mb-4">{t('tutorial.common.startPrompt.title')}</h2>
				<p class="text-gray-600 dark:text-gray-300 mb-6">
					{t('tutorial.common.startPrompt.text')}
				</p>
				<div class="flex gap-3 justify-end">
					<button class="btn btn-secondary" on:click={handleSkip}>
						{t('tutorial.common.startPrompt.later')}
					</button>
					<button class="btn btn-primary" on:click={handleStart}>
						{t('tutorial.common.startPrompt.start')}
					</button>
				</div>
			{:else if type === 'resume'}
				<h2 class="text-xl font-bold mb-4">{t('tutorial.common.resumePrompt.title')}</h2>
				<p class="text-gray-600 dark:text-gray-300 mb-2">
					{t('tutorial.common.resumePrompt.text')}
				</p>
				<p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
					{tutorialName}
				</p>
				<div class="flex gap-3 justify-end flex-wrap">
					<button class="btn btn-secondary" on:click={handleSkip}>
						{t('tutorial.common.resumePrompt.skip')}
					</button>
					<button class="btn btn-secondary" on:click={handleStartOver}>
						{t('tutorial.common.resumePrompt.startOver')}
					</button>
					<button class="btn btn-primary" on:click={handleResume}>
						{t('tutorial.common.resumePrompt.resume')}
					</button>
				</div>
			{:else if type === 'rerun'}
				<h2 class="text-xl font-bold mb-4">{t('tutorial.common.rerunPrompt.title')}</h2>
				<p class="text-gray-600 dark:text-gray-300 mb-2">
					{t('tutorial.common.rerunPrompt.text')}
				</p>
				<p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
					{tutorialName}
				</p>
				<div class="flex gap-3 justify-end">
					<button class="btn btn-secondary" on:click={handleSkip}>
						{t('tutorial.common.rerunPrompt.skip')}
					</button>
					<button class="btn btn-primary" on:click={handleStart}>
						{t('tutorial.common.rerunPrompt.rerun')}
					</button>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.btn {
		padding: 0.5rem 1rem;
		border-radius: 0.375rem;
		font-weight: 500;
		transition: all 0.2s;
	}

	.btn-primary {
		background-color: #2563eb;
		color: white;
	}

	.btn-primary:hover {
		background-color: #1d4ed8;
	}

	.btn-secondary {
		background-color: #e5e7eb;
		color: #374151;
	}

	.btn-secondary:hover {
		background-color: #d1d5db;
	}

	:global(.dark) .btn-secondary {
		background-color: #4b5563;
		color: #e5e7eb;
	}

	:global(.dark) .btn-secondary:hover {
		background-color: #6b7280;
	}
</style>
