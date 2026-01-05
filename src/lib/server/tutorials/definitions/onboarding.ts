import { SUPER_ADMIN_ROLE_ID } from '$lib/types/User';
import type { Tutorial } from '$lib/types/Tutorial';

export const onboardingTutorial: Tutorial = {
	_id: 'onboarding',
	name: 'Super Admin Onboarding',
	description: 'Initial setup guide for new be-BOP installations',
	version: 2,
	targetRoles: [SUPER_ADMIN_ROLE_ID],
	isActive: true,
	triggerType: 'first-login',
	estimatedTimeMinutes: 10,
	steps: [
		{
			id: 'arm-recovery-input',
			order: 1,
			route: '/admin/arm',
			attachTo: { element: 'form[data-role="super-admin"] input[name="recoveryNpub"]', on: 'bottom' },
			titleKey: 'tutorial.onboarding.step1.title',
			textKey: 'tutorial.onboarding.step1.text',
			requiredAction: {
				type: 'input',
				selector: 'form[data-role="super-admin"] input[name="recoveryNpub"]',
				validation: 'non-empty'
			}
		},
		{
			id: 'arm-recovery-save',
			order: 2,
			route: '/admin/arm',
			attachTo: { element: 'form[data-role="super-admin"] button[type="submit"][title="Save"]', on: 'bottom' },
			titleKey: 'tutorial.onboarding.step2.title',
			textKey: 'tutorial.onboarding.step2.text',
			requiredAction: {
				type: 'click',
				selector: 'form[data-role="super-admin"] button[type="submit"][title="Save"]'
			}
		},
		{
			id: 'nostr-key',
			order: 3,
			route: '/admin/nostr',
			attachTo: { element: 'button.btn-black', on: 'right' },
			titleKey: 'tutorial.onboarding.step3.title',
			textKey: 'tutorial.onboarding.step3.text',
			requiredAction: {
				type: 'click',
				selector: 'button.btn-black'
			}
		},
		{
			id: 'admin-hash',
			order: 4,
			route: '/admin/config',
			attachTo: { element: 'input[name="adminHash"]', on: 'right' },
			titleKey: 'tutorial.onboarding.step4.title',
			textKey: 'tutorial.onboarding.step4.text',
			requiredAction: {
				type: 'input',
				selector: 'input[name="adminHash"]',
				validation: 'non-empty'
			}
		},
		{
			id: 'identity-setup',
			order: 5,
			route: '/admin/identity',
			attachTo: { element: 'input[name="businessName"]', on: 'right' },
			titleKey: 'tutorial.onboarding.step5.title',
			textKey: 'tutorial.onboarding.step5.text',
			requiredAction: {
				type: 'form-submit',
				selector: 'form'
			}
		}
	],
	createdAt: new Date(),
	updatedAt: new Date()
};
