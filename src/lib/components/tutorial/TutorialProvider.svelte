<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { beforeNavigate, afterNavigate } from '$app/navigation';
	import { page } from '$app/stores';
	import Shepherd from 'shepherd.js';
	import { tutorialStore } from '$lib/stores/tutorial';
	import { useI18n } from '$lib/i18n';
	import type { Tutorial } from '$lib/types/Tutorial';
	import type { TutorialProgress } from '$lib/types/TutorialProgress';
	import TutorialPrompt from './TutorialPrompt.svelte';

	export let tutorial: Tutorial | null = null;
	export let progress: TutorialProgress | null = null;
	export let adminPrefix: string = '/admin';

	const { t } = useI18n();

	let tour: Shepherd.Tour | null = null;
	let isNavigating = false;
	let pendingStepIndex: number | null = null;

	// Handle navigation - pause tour before, resume after
	beforeNavigate(({ to, cancel }) => {
		if (tour && $tutorialStore.isActive && $tutorialStore.status === 'running') {
			isNavigating = true;
			pendingStepIndex = $tutorialStore.currentStepIndex;
			tutorialStore.pauseForNavigation();
			tour.hide();
		}
	});

	afterNavigate(({ to }) => {
		if (isNavigating && pendingStepIndex !== null && $tutorialStore.isActive) {
			isNavigating = false;

			// Check if we're on the correct route for the current step
			if (to?.url.pathname && tutorialStore.isOnCorrectRoute(to.url.pathname)) {
				// Resume tour after DOM settles
				setTimeout(() => {
					tutorialStore.resumeAfterNavigation();
					if (tour) {
						showCurrentStep();
					}
					pendingStepIndex = null;
				}, 300);
			}
		}
	});

	function normalizeRoute(route: string): string {
		return route.replace('/admin', adminPrefix);
	}

	function initializeTour() {
		if (!tutorial) return;

		tour = new Shepherd.Tour({
			useModalOverlay: true,
			defaultStepOptions: {
				cancelIcon: {
					enabled: true
				},
				classes: 'shepherd-theme-custom',
				scrollTo: { behavior: 'smooth', block: 'center' },
				popperOptions: {
					modifiers: [
						{
							name: 'offset',
							options: {
								offset: [0, 16] // 16px gap between element and tooltip
							}
						},
						{
							name: 'preventOverflow',
							options: {
								padding: 16
							}
						}
					]
				}
			}
		});

		// Add steps from tutorial definition
		tutorial.steps.forEach((step, index) => {
			tour!.addStep({
				id: step.id,
				title: t(step.titleKey),
				text: t(step.textKey),
				attachTo: {
					element: step.attachTo.element,
					on: step.attachTo.on
				},
				buttons: getButtonsForStep(index),
				when: {
					show: () => {
						// Wait for element to be available
						waitForElement(step.attachTo.element);
					}
				}
			});
		});

		// Tour event handlers
		tour.on('cancel', handleTourCancel);
		tour.on('complete', handleTourComplete);
	}

	function getButtonsForStep(stepIndex: number): Shepherd.Step.StepOptionsButton[] {
		const buttons: Shepherd.Step.StepOptionsButton[] = [];
		const isFirstStep = stepIndex === 0;
		const isLastStep = tutorial && stepIndex === tutorial.steps.length - 1;

		// Skip button (if allowed)
		buttons.push({
			text: t('tutorial.common.skip'),
			classes: 'shepherd-button-secondary',
			action: () => handleSkip()
		});

		// Back button (not on first step)
		if (!isFirstStep) {
			buttons.push({
				text: t('tutorial.common.back'),
				classes: 'shepherd-button-secondary',
				action: () => handleBack()
			});
		}

		// Next/Finish button
		buttons.push({
			text: isLastStep ? t('tutorial.common.finish') : t('tutorial.common.next'),
			classes: 'shepherd-button-primary',
			action: () => (isLastStep ? handleComplete() : handleNext())
		});

		return buttons;
	}

	function waitForElement(selector: string, maxAttempts = 20) {
		let attempts = 0;
		const check = () => {
			const el = document.querySelector(selector);
			if (el) {
				return;
			}
			attempts++;
			if (attempts < maxAttempts) {
				setTimeout(check, 100);
			}
		};
		check();
	}

	function showCurrentStep() {
		if (!tour || !tutorial) return;

		const stepIndex = $tutorialStore.currentStepIndex;
		const step = tutorial.steps[stepIndex];

		if (!step) return;

		// Check if we need to navigate to the step's route
		const currentPath = $page.url.pathname.replace(/^\/admin-[a-zA-Z0-9]+/, '/admin');
		const stepRoute = step.route;

		if (!currentPath.startsWith(stepRoute)) {
			// Need to navigate first - the afterNavigate will resume the tour
			tutorialStore.pauseForNavigation();
			window.location.href = normalizeRoute(stepRoute);
			return;
		}

		// Show the step
		tour.show(stepIndex);
	}

	function handleNext() {
		if (!tutorial) return;

		const nextIndex = $tutorialStore.currentStepIndex + 1;

		if (nextIndex >= tutorial.steps.length) {
			handleComplete();
			return;
		}

		const nextStep = tutorial.steps[nextIndex];
		const currentPath = $page.url.pathname.replace(/^\/admin-[a-zA-Z0-9]+/, '/admin');

		tutorialStore.nextStep();

		// Check if we need to navigate
		if (!currentPath.startsWith(nextStep.route)) {
			tutorialStore.pauseForNavigation();
			tour?.hide();
			window.location.href = normalizeRoute(nextStep.route);
		} else {
			tour?.next();
		}
	}

	function handleBack() {
		if (!tutorial) return;

		const prevIndex = $tutorialStore.currentStepIndex - 1;
		if (prevIndex < 0) return;

		const prevStep = tutorial.steps[prevIndex];
		const currentPath = $page.url.pathname.replace(/^\/admin-[a-zA-Z0-9]+/, '/admin');

		tutorialStore.prevStep();

		// Check if we need to navigate
		if (!currentPath.startsWith(prevStep.route)) {
			tutorialStore.pauseForNavigation();
			tour?.hide();
			window.location.href = normalizeRoute(prevStep.route);
		} else {
			tour?.back();
		}
	}

	function handleSkip() {
		tour?.cancel();
		tutorialStore.skipTutorial();
		// TODO: Save skip status to server
		dispatchEvent(new CustomEvent('tutorial:skipped', { detail: { tutorialId: tutorial?._id } }));
	}

	function handleComplete() {
		const totalTime = tutorialStore.completeTutorial();
		tour?.complete();
		// TODO: Save completion to server
		dispatchEvent(
			new CustomEvent('tutorial:completed', {
				detail: { tutorialId: tutorial?._id, totalTimeMs: totalTime }
			})
		);
	}

	function handleTourCancel() {
		// Already handled in handleSkip
	}

	function handleTourComplete() {
		// Already handled in handleComplete
	}

	// Start tutorial
	export function startTutorial() {
		if (!tutorial) return;

		tutorialStore.startTutorial(tutorial, progress ?? undefined);
		initializeTour();
		showCurrentStep();
	}

	// Handle prompt responses
	function handlePromptStart() {
		tutorialStore.hidePrompt();
		startTutorial();
	}

	function handlePromptSkip() {
		tutorialStore.hidePrompt();
		tutorialStore.skipTutorial();
		dispatchEvent(new CustomEvent('tutorial:skipped', { detail: { tutorialId: tutorial?._id } }));
	}

	function handlePromptResume() {
		tutorialStore.hidePrompt();
		if (tutorial && progress) {
			tutorialStore.startTutorial(tutorial, progress);
			initializeTour();
			showCurrentStep();
		}
	}

	function handleRequestStart(event: CustomEvent) {
		if (tutorial) {
			tutorialStore.showPrompt('start');
		}
	}

	onMount(() => {
		// Listen for external requests to start the tutorial
		window.addEventListener('tutorial:request-start', handleRequestStart as EventListener);

		// Check if we need to restore a paused tour
		const restored = tutorialStore.initialize();
		if (restored && tutorial) {
			initializeTour();
			setTimeout(() => showCurrentStep(), 300);
		}

		return () => {
			window.removeEventListener('tutorial:request-start', handleRequestStart as EventListener);
		};
	});

	onDestroy(() => {
		if (tour) {
			tour.cancel();
			tour = null;
		}
	});
</script>

<slot />

{#if $tutorialStore.showPrompt}
	<TutorialPrompt
		type={$tutorialStore.promptType}
		tutorialName={tutorial?.name ?? ''}
		on:start={handlePromptStart}
		on:skip={handlePromptSkip}
		on:resume={handlePromptResume}
	/>
{/if}

<style>
	:global(.shepherd-theme-custom) {
		max-width: 400px;
		z-index: 10000;
	}

	:global(.shepherd-theme-custom .shepherd-content) {
		border-radius: 8px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
	}

	:global(.shepherd-theme-custom .shepherd-header) {
		background: #3b82f6;
		color: white;
		padding: 12px 16px;
		border-radius: 8px 8px 0 0;
	}

	:global(.shepherd-theme-custom .shepherd-title) {
		font-size: 1rem;
		font-weight: 600;
		margin: 0;
	}

	:global(.shepherd-theme-custom .shepherd-cancel-icon) {
		color: white;
		opacity: 0.8;
	}

	:global(.shepherd-theme-custom .shepherd-cancel-icon:hover) {
		opacity: 1;
	}

	:global(.shepherd-theme-custom .shepherd-text) {
		padding: 16px;
		font-size: 0.9rem;
		line-height: 1.5;
		color: #374151;
	}

	:global(.shepherd-theme-custom .shepherd-footer) {
		padding: 12px 16px;
		border-top: 1px solid #e5e7eb;
		display: flex;
		justify-content: flex-end;
		gap: 8px;
	}

	:global(.shepherd-theme-custom .shepherd-button) {
		padding: 8px 16px;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	:global(.shepherd-theme-custom .shepherd-button-primary) {
		background: #3b82f6;
		color: white;
		border: none;
	}

	:global(.shepherd-theme-custom .shepherd-button-primary:hover) {
		background: #2563eb;
	}

	:global(.shepherd-theme-custom .shepherd-button-secondary) {
		background: transparent;
		color: #6b7280;
		border: 1px solid #d1d5db;
	}

	:global(.shepherd-theme-custom .shepherd-button-secondary:hover) {
		background: #f3f4f6;
		color: #374151;
	}

	/* Arrow styling */
	:global(.shepherd-theme-custom .shepherd-arrow) {
		border-width: 8px;
	}

	:global(.shepherd-theme-custom .shepherd-arrow::before) {
		background: white;
	}

	/* Modal overlay - make highlighted element more visible */
	:global(.shepherd-modal-overlay-container) {
		fill: rgba(0, 0, 0, 0.5);
	}

	/* Highlighted element gets a subtle outline */
	:global(.shepherd-target) {
		outline: 3px solid #3b82f6 !important;
		outline-offset: 4px;
		border-radius: 4px;
	}
</style>
