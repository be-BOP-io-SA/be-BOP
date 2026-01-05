<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { beforeNavigate, afterNavigate, goto } from '$app/navigation';
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
		if (tour && $tutorialStore.isActive) {
			const status = $tutorialStore.status;
			if (status === 'running') {
				// User navigated manually while tour is running
				tutorialStore.pauseForNavigation();
				tour.hide();
			}
			if (status === 'running' || status === 'waiting_for_navigation') {
				isNavigating = true;
				pendingStepIndex = $tutorialStore.currentStepIndex;
			}
		}
	});

	afterNavigate(({ to }) => {
		console.log('[Tutorial] afterNavigate', {
			isNavigating,
			pendingStepIndex,
			isActive: $tutorialStore.isActive,
			tour: !!tour,
			tutorial: !!tutorial,
			toPath: to?.url.pathname
		});
		if (isNavigating && pendingStepIndex !== null && $tutorialStore.isActive) {
			isNavigating = false;

			// Check if we're on the correct route for the current step
			const isCorrectRoute = to?.url.pathname && tutorialStore.isOnCorrectRoute(to.url.pathname);
			console.log('[Tutorial] isCorrectRoute', isCorrectRoute);
			if (isCorrectRoute) {
				// Resume tour after DOM settles
				setTimeout(() => {
					console.log('[Tutorial] afterNavigate timeout - resuming', { tour: !!tour });
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
				buttons: getButtonsForStep(index)
			});
		});

		// Tour event handlers
		tour.on('cancel', handleTourCancel);
		tour.on('complete', handleTourComplete);
	}

	function isRequiredActionComplete(stepIndex: number): boolean {
		if (!tutorial) return true;
		const step = tutorial.steps[stepIndex];
		if (!step?.requiredAction) return true;

		const { type, selector, validation } = step.requiredAction;

		if (type === 'input' && validation === 'non-empty' && selector) {
			const input = document.querySelector(selector) as HTMLInputElement | null;
			return input ? input.value.trim().length > 0 : false;
		}

		// For click and form-submit, we don't block - they proceed on action
		return true;
	}

	function setupRequiredActionListener(stepIndex: number) {
		if (!tutorial || !tour) return;
		const step = tutorial.steps[stepIndex];
		if (!step?.requiredAction) return;

		const { type, selector, validation } = step.requiredAction;

		if (type === 'input' && validation === 'non-empty' && selector) {
			const input = document.querySelector(selector) as HTMLInputElement | null;
			if (input) {
				const updateButtonState = () => {
					const nextBtn = document.querySelector('.shepherd-button-primary') as HTMLButtonElement | null;
					if (nextBtn) {
						const isComplete = input.value.trim().length > 0;
						nextBtn.disabled = !isComplete;
						nextBtn.style.opacity = isComplete ? '1' : '0.5';
						nextBtn.style.cursor = isComplete ? 'pointer' : 'not-allowed';
					}
				};

				// Initial state
				updateButtonState();

				// Listen for changes
				input.addEventListener('input', updateButtonState);

				// Store cleanup function
				(window as any).__tutorialCleanup = () => {
					input.removeEventListener('input', updateButtonState);
				};
			}
		}
	}

	function cleanupRequiredActionListener() {
		if ((window as any).__tutorialCleanup) {
			(window as any).__tutorialCleanup();
			delete (window as any).__tutorialCleanup;
		}
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
			action: () => {
				if (!isRequiredActionComplete(stepIndex)) {
					return; // Don't proceed if required action not complete
				}
				isLastStep ? handleComplete() : handleNext();
			}
		});

		return buttons;
	}

	function waitForElement(selector: string, maxAttempts = 30): Promise<Element | null> {
		return new Promise((resolve) => {
			let attempts = 0;
			const check = () => {
				const el = document.querySelector(selector);
				if (el) {
					resolve(el);
					return;
				}
				attempts++;
				if (attempts < maxAttempts) {
					setTimeout(check, 100);
				} else {
					console.warn(`Tutorial: Element not found after ${maxAttempts} attempts: ${selector}`);
					resolve(null);
				}
			};
			check();
		});
	}

	async function showCurrentStep() {
		console.log('[Tutorial] showCurrentStep called', { tour: !!tour, tutorial: !!tutorial });
		if (!tour || !tutorial) {
			console.log('[Tutorial] showCurrentStep early return - tour or tutorial missing');
			return;
		}

		const stepIndex = $tutorialStore.currentStepIndex;
		const step = tutorial.steps[stepIndex];
		console.log('[Tutorial] step', { stepIndex, step: step?.id });

		if (!step) {
			console.log('[Tutorial] showCurrentStep early return - no step');
			return;
		}

		// Check if we need to navigate to the step's route
		const currentPath = $page.url.pathname.replace(/^\/admin-[a-zA-Z0-9]+/, '/admin');
		const stepRoute = step.route;

		if (!currentPath.startsWith(stepRoute)) {
			// Need to navigate first - the afterNavigate will resume the tour
			tutorialStore.pauseForNavigation();
			await goto(normalizeRoute(stepRoute));
			return;
		}

		// Wait for the target element to be available
		console.log('[Tutorial] waiting for element', step.attachTo.element);
		const element = await waitForElement(step.attachTo.element);
		if (!element) {
			console.error(`[Tutorial] Cannot show step ${step.id}, element not found: ${step.attachTo.element}`);
			return;
		}

		// Cleanup previous listener
		cleanupRequiredActionListener();

		// Show the step
		console.log('[Tutorial] showing step', stepIndex);
		tour.show(stepIndex);

		// Setup listener for required action validation (after a small delay for DOM)
		setTimeout(() => setupRequiredActionListener(stepIndex), 100);
	}

	async function handleNext() {
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
			await goto(normalizeRoute(nextStep.route));
		} else {
			tour?.next();
		}
	}

	async function handleBack() {
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
			await goto(normalizeRoute(prevStep.route));
		} else {
			tour?.back();
		}
	}

	function handleSkip() {
		cleanupRequiredActionListener();
		tour?.cancel();
		tutorialStore.skipTutorial();
		// TODO: Save skip status to server
		dispatchEvent(new CustomEvent('tutorial:skipped', { detail: { tutorialId: tutorial?._id } }));
	}

	function handleComplete() {
		cleanupRequiredActionListener();
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
		console.log('[Tutorial] startTutorial called', { tutorial: !!tutorial });
		if (!tutorial) return;

		tutorialStore.startTutorial(tutorial, progress ?? undefined);
		initializeTour();
		console.log('[Tutorial] tour initialized, calling showCurrentStep');
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
		console.log('[Tutorial] onMount', { tutorial: !!tutorial });
		// Listen for external requests to start the tutorial
		window.addEventListener('tutorial:request-start', handleRequestStart as EventListener);

		// Check if we need to restore a paused tour
		const restored = tutorialStore.initialize();
		console.log('[Tutorial] onMount restored', { restored, tutorial: !!tutorial });
		if (restored && tutorial) {
			initializeTour();
			setTimeout(() => showCurrentStep(), 300);
		}

		return () => {
			window.removeEventListener('tutorial:request-start', handleRequestStart as EventListener);
		};
	});

	onDestroy(() => {
		console.log('[Tutorial] onDestroy');
		cleanupRequiredActionListener();
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
