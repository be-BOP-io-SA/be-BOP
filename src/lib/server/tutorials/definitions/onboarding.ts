import { SUPER_ADMIN_ROLE_ID } from '$lib/types/User';
import type { Tutorial } from '$lib/types/Tutorial';

export const onboardingTutorial: Tutorial = {
	_id: 'onboarding',
	name: 'Super Admin Onboarding',
	description: 'Initial setup guide for new be-BOP installations',
	version: 1,
	targetRoles: [SUPER_ADMIN_ROLE_ID],
	isActive: true,
	triggerType: 'first-login',
	estimatedTimeMinutes: 10,
	steps: [
		{
			id: 'arm-recovery',
			order: 1,
			route: '/admin/arm',
			attachTo: { element: 'input[name="recoveryNpub"]', on: 'bottom' },
			titleKey: 'tutorial.onboarding.step1.title',
			textKey: 'tutorial.onboarding.step1.text',
			requiredAction: {
				type: 'input',
				selector: 'input[name="recoveryNpub"]',
				validation: 'non-empty'
			}
		},
		{
			id: 'nostr-key',
			order: 2,
			route: '/admin/nostr',
			attachTo: { element: 'button.btn-black', on: 'right' },
			titleKey: 'tutorial.onboarding.step2.title',
			textKey: 'tutorial.onboarding.step2.text',
			requiredAction: {
				type: 'click',
				selector: 'button.btn-black'
			}
		},
		{
			id: 'admin-hash',
			order: 3,
			route: '/admin/config',
			attachTo: { element: 'input[name="adminHash"]', on: 'right' },
			titleKey: 'tutorial.onboarding.step3.title',
			textKey: 'tutorial.onboarding.step3.text',
			requiredAction: {
				type: 'input',
				selector: 'input[name="adminHash"]',
				validation: 'non-empty'
			}
		},
		{
			id: 'identity-setup',
			order: 4,
			route: '/admin/identity',
			attachTo: { element: 'input[name="businessName"]', on: 'right' },
			titleKey: 'tutorial.onboarding.step4.title',
			textKey: 'tutorial.onboarding.step4.text',
			requiredAction: {
				type: 'form-submit',
				selector: 'form'
			}
		}
	],
	createdAt: new Date(),
	updatedAt: new Date()
};
