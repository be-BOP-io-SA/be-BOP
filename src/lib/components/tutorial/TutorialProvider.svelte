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
	let isShowingStep = false; // Guard against concurrent calls

	beforeNavigate(() => {
		console.log('[Tutorial] beforeNavigate');
		if (tour && $tutorialStore.isActive) {
			tour.hide();
			isNavigating = true;
		}
	});

	afterNavigate(() => {
		console.log('[Tutorial] afterNavigate', { isNavigating, pendingStepIndex, isActive: $tutorialStore.isActive });
		// Only proceed if we initiated the navigation AND have a pending step
		if (isNavigating && pendingStepIndex !== null && $tutorialStore.isActive) {
			const stepToShow = pendingStepIndex;
			isNavigating = false;
			pendingStepIndex = null;
			// Small delay to let the page render
			setTimeout(() => {
				console.log('[Tutorial] Showing step after navigation:', stepToShow);
				showCurrentStep();
			}, 150);
		} else {
			// Reset flags if conditions aren't met
			isNavigating = false;
		}
	});

	function waitForElement(selector: string, timeout = 3000): Promise<Element | null> {
		return new Promise((resolve) => {
			const element = document.querySelector(selector);
			if (element) {
				resolve(element);
				return;
			}

			let resolved = false;
			const observer = new MutationObserver(() => {
				if (resolved) return;
				const el = document.querySelector(selector);
				if (el) {
					resolved = true;
					observer.disconnect();
					resolve(el);
				}
			});

			observer.observe(document.body, { childList: true, subtree: true });

			setTimeout(() => {
				if (!resolved) {
					resolved = true;
					observer.disconnect();
					resolve(null);
				}
			}, timeout);
		});
	}

	function initializeTour() {
		if (!tutorial) return;

		tour = new Shepherd.Tour({
			useModalOverlay: true,
			defaultStepOptions: {
				cancelIcon: { enabled: true },
				scrollTo: { behavior: 'smooth', block: 'center' }
			}
		});

		tour.on('cancel', () => {
			console.log('[Tutorial] Tour cancelled');
			tutorialStore.skipTutorial();
		});

		console.log('[Tutorial] Tour initialized');
	}

	async function showCurrentStep() {
		if (!tutorial || !tour) return;

		// Prevent concurrent calls
		if (isShowingStep) {
			console.log('[Tutorial] Already showing a step, skipping');
			return;
		}
		isShowingStep = true;

		try {
			const state = $tutorialStore;
			const stepDef = tutorial.steps[state.currentStepIndex];

			if (!stepDef) {
				console.log('[Tutorial] No step definition for index', state.currentStepIndex);
				return;
			}

			console.log('[Tutorial] Showing step', stepDef.id, 'on route', stepDef.route);

			// Check if we need to navigate first
			const currentPath = $page.url.pathname.replace(/^\/admin-[a-zA-Z0-9]+/, '/admin');
			if (!currentPath.startsWith(stepDef.route)) {
				console.log('[Tutorial] Need to navigate from', currentPath, 'to', stepDef.route);
				pendingStepIndex = state.currentStepIndex;
				tutorialStore.pauseForNavigation();
				const targetRoute = stepDef.route.replace('/admin', adminPrefix);
				await goto(targetRoute);
				return;
			}

			// Check skip condition (only after navigation, so we're on the right page)
			if (stepDef.skipCondition) {
				const { elementExists, elementMissing } = stepDef.skipCondition;
				let shouldSkip = false;
				let skipReason = '';

				if (elementExists && document.querySelector(elementExists)) {
					console.log('[Tutorial] Skip condition met: element exists', elementExists);
					shouldSkip = true;
					skipReason = 'already_configured';
				}
				if (elementMissing && !document.querySelector(elementMissing)) {
					console.log('[Tutorial] Skip condition met: element missing', elementMissing);
					shouldSkip = true;
					skipReason = 'not_available';
				}

				if (shouldSkip) {
					console.log('[Tutorial] Showing skip notification for step', stepDef.id);

					// Clear existing steps
					const stepsToDestroy = [...tour.steps];
					for (const step of stepsToDestroy) {
						step.destroy();
					}

					// Show a brief notification that this step is being skipped
					const skipTitle = t('tutorial.common.stepSkipped') || 'Step Complete';
					const skipText = skipReason === 'already_configured'
						? (t('tutorial.common.alreadyConfigured') || 'This is already configured. Moving to the next step...')
						: (t('tutorial.common.stepNotNeeded') || 'This step is not needed. Moving to the next step...');

					tour.addStep({
						id: `${stepDef.id}-skipped`,
						title: `${tutorial.name} - ${stepDef.id}`,
						text: `<p>${skipText}</p>`,
						buttons: [{
							text: t('tutorial.common.next') || 'Next',
							action: async () => {
								tour?.hide();
								tutorialStore.nextStep();
								isShowingStep = false; // Reset guard before recursive call
								await showCurrentStep();
							}
						}]
					});

					tour.show(`${stepDef.id}-skipped`);
					return;
				}
			}

			// Wait for element
			console.log('[Tutorial] Waiting for element:', stepDef.attachTo.element);
			const element = await waitForElement(stepDef.attachTo.element);
			if (!element) {
				console.error('[Tutorial] Cannot show step', stepDef.id, ', element not found:', stepDef.attachTo.element);
				return;
			}
			console.log('[Tutorial] Element found, clearing old steps');

			// Clear existing steps and add current one
			const stepsToDestroy = [...tour.steps];
			console.log('[Tutorial] Steps to destroy:', stepsToDestroy.length);
			for (const step of stepsToDestroy) {
				step.destroy();
			}
			console.log('[Tutorial] Steps cleared, adding new step');

			const isLastStep = state.currentStepIndex >= tutorial.steps.length - 1;
			const buttons: Array<{ text: string; action: () => void | Promise<void>; classes?: string; disabled?: boolean }> = [];

			if (state.currentStepIndex > 0) {
				buttons.push({
					text: t('tutorial.common.previous') || 'Previous',
					action: async () => {
						tour?.hide();
						tutorialStore.prevStep();
						await showCurrentStep();
					},
					classes: 'shepherd-button-secondary'
				});
			}

			if (isLastStep) {
				buttons.push({
					text: t('tutorial.common.finish') || 'Finish',
					action: async () => {
						const totalTime = tutorialStore.completeTutorial();
						tour?.complete();
						try {
							await fetch('/api/tutorial/complete', {
								method: 'POST',
								headers: { 'Content-Type': 'application/json' },
								body: JSON.stringify({ tutorialId: tutorial?._id, totalTimeMs: totalTime })
							});
						} catch (e) {
							console.error('[Tutorial] Failed to save completion:', e);
						}
					}
				});
			} else {
				const hasRequiredAction = !!stepDef.requiredAction;
				const currentStepId = stepDef.id;
				buttons.push({
					text: t('tutorial.common.next') || 'Next',
					action: async () => {
						console.log('[Tutorial] ===== NEXT BUTTON CLICKED =====');
						console.log('[Tutorial] Current step was:', currentStepId);
						console.log('[Tutorial] Store state before nextStep:', $tutorialStore.currentStepIndex);
						tour?.hide();
						tutorialStore.nextStep();
						console.log('[Tutorial] Store state after nextStep:', $tutorialStore.currentStepIndex);
						await showCurrentStep();
						console.log('[Tutorial] ===== NEXT COMPLETE =====');
					},
					disabled: hasRequiredAction,
					classes: hasRequiredAction ? 'shepherd-button-primary shepherd-button-disabled' : 'shepherd-button-primary'
				});
			}

			console.log('[Tutorial] Adding step to tour');
			const stepTitle = t(stepDef.titleKey) || stepDef.titleKey;
			const stepText = t(stepDef.textKey) || stepDef.textKey;
			const stepCounter = t('tutorial.common.stepCounter', { current: state.currentStepIndex + 1, total: tutorial.steps.length }) || `Step ${state.currentStepIndex + 1} of ${tutorial.steps.length}`;

			tour.addStep({
				id: stepDef.id,
				title: `${tutorial.name} - ${stepCounter}`,
				text: `<strong>${stepTitle}</strong><br/>${stepText}`,
				attachTo: { element: stepDef.attachTo.element, on: stepDef.attachTo.on },
				buttons
			});

			console.log('[Tutorial] Showing step:', stepDef.id);
			tour.show(stepDef.id);
			console.log('[Tutorial] Step shown');

			if (stepDef.requiredAction) {
				setupRequiredActionMonitoring(stepDef);
			}
			console.log('[Tutorial] showCurrentStep finished');
		} finally {
			isShowingStep = false;
		}
	}

	function setupRequiredActionMonitoring(stepDef: Tutorial['steps'][0]) {
		if (!stepDef.requiredAction) return;

		const { type, selector, validation } = stepDef.requiredAction;

		const enableNextButton = () => {
			const footer = document.querySelector('.shepherd-footer');
			const buttons = footer?.querySelectorAll('button');
			const nextBtn = buttons && buttons.length > 0 ? buttons[buttons.length - 1] as HTMLButtonElement : null;
			if (nextBtn) {
				nextBtn.disabled = false;
				nextBtn.style.opacity = '1';
				nextBtn.style.pointerEvents = 'auto';
			}
		};

		const disableNextButton = () => {
			const footer = document.querySelector('.shepherd-footer');
			const buttons = footer?.querySelectorAll('button');
			const nextBtn = buttons && buttons.length > 0 ? buttons[buttons.length - 1] as HTMLButtonElement : null;
			if (nextBtn) {
				nextBtn.disabled = true;
				nextBtn.style.opacity = '0.5';
				nextBtn.style.pointerEvents = 'none';
			}
		};

		if (type === 'input' && validation === 'non-empty') {
			const input = document.querySelector(selector!) as HTMLInputElement;
			if (!input) {
				console.log('[Tutorial] Input not found for monitoring:', selector);
				return;
			}

			console.log('[Tutorial] Setting up input monitoring for', selector);

			const updateButtonState = () => {
				const hasValue = input.value.trim().length > 0;
				if (hasValue) {
					enableNextButton();
				} else {
					disableNextButton();
				}
			};

			input.addEventListener('input', updateButtonState);
			input.addEventListener('change', updateButtonState);

			// Initial state after Shepherd renders
			setTimeout(updateButtonState, 150);

		} else if (type === 'click') {
			// For click actions, enable the Next button immediately
			// The user needs to click the target element, but we don't block the tutorial
			console.log('[Tutorial] Click action step - Next button enabled');
			setTimeout(enableNextButton, 150);
		} else if (type === 'form-submit') {
			// For form submissions, enable the Next button immediately
			console.log('[Tutorial] Form submit action step - Next button enabled');
			setTimeout(enableNextButton, 150);
		}
	}

	async function startTutorial() {
		if (!tutorial) return;

		console.log('[Tutorial] Starting tutorial', tutorial._id);
		tutorialStore.reset(); // Clear any existing state
		tutorialStore.startTutorial(tutorial, progress ?? undefined);
		initializeTour();
		await showCurrentStep();
	}

	function handleRequestStart(event: CustomEvent) {
		if (tutorial) {
			tutorialStore.showPrompt('start');
		}
	}

	function handlePromptStart() {
		tutorialStore.hidePrompt();
		console.log('[Tutorial] Starting tutorial from prompt...');
		startTutorial();
	}

	function handlePromptSkip() {
		tutorialStore.hidePrompt();
		tutorialStore.skipTutorial();
	}

	function handlePromptResume() {
		tutorialStore.hidePrompt();
		console.log('[Tutorial] Resuming tutorial...');
		startTutorial();
	}

	onMount(() => {
		console.log('[Tutorial] onMount', { tutorial: !!tutorial, isActive: $tutorialStore.isActive });
		window.addEventListener('tutorial:request-start', handleRequestStart as EventListener);

		// Try to restore tutorial state (e.g., after page reload from form submission)
		if (tutorial) {
			const restoredStepIndex = tutorialStore.initialize();
			if (restoredStepIndex >= 0) {
				console.log('[Tutorial] Restoring tutorial after page reload to step', restoredStepIndex);
				initializeTour();
				// Use setTimeout to let the page render first
				setTimeout(() => {
					showCurrentStep();
				}, 200);
			}
		}

		return () => {
			window.removeEventListener('tutorial:request-start', handleRequestStart as EventListener);
		};
	});

	onDestroy(() => {
		if (tour) {
			tour.complete();
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
