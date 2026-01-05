<script lang="ts">
	import { tutorialStore } from '$lib/stores/tutorial';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	$: currentStep = $tutorialStore.currentStepIndex + 1;
	$: totalSteps = $tutorialStore.totalSteps;
	$: progressPercent = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;
	$: tutorialName = $tutorialStore.currentTutorial?.name ?? '';
</script>

{#if $tutorialStore.isActive}
	<div class="tutorial-progress">
		<div class="tutorial-progress-header">
			<span class="tutorial-name">{tutorialName}</span>
			<span class="tutorial-step-count">
				{t('tutorial.common.progress', { current: currentStep, total: totalSteps })}
			</span>
		</div>
		<div class="tutorial-progress-bar">
			<div class="tutorial-progress-fill" style="width: {progressPercent}%" />
		</div>
	</div>
{/if}

<style>
	.tutorial-progress {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		background: linear-gradient(to bottom, rgba(37, 99, 235, 0.95), rgba(37, 99, 235, 0.9));
		color: white;
		padding: 0.5rem 1rem;
		z-index: 9990;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.tutorial-progress-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.25rem;
		font-size: 0.875rem;
	}

	.tutorial-name {
		font-weight: 600;
	}

	.tutorial-step-count {
		opacity: 0.9;
	}

	.tutorial-progress-bar {
		height: 4px;
		background: rgba(255, 255, 255, 0.3);
		border-radius: 2px;
		overflow: hidden;
	}

	.tutorial-progress-fill {
		height: 100%;
		background: white;
		border-radius: 2px;
		transition: width 0.3s ease;
	}
</style>
