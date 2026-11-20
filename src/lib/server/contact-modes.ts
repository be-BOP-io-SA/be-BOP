import type { ContactMode } from '$lib/types/ContactMode';
import { isEmailConfigured } from './email';
import { isNostrConfigured } from './nostr';
import { runtimeConfig } from './runtime-config';

/**
 * Contact modes a customer can leave an address for: the ones listed in the
 * "Contact Modes" setting whose channel is configured (SMTP for email, nsec for
 * Nostr), unless "Force option display" bypasses that configuration check.
 */
export function availableContactModes(): ContactMode[] {
	const force = runtimeConfig.contactModesForceOption;
	const modes: ContactMode[] = [];
	if (runtimeConfig.contactModes.includes('email') && (force || isEmailConfigured())) {
		modes.push('email');
	}
	if (runtimeConfig.contactModes.includes('nostr') && (force || isNostrConfigured())) {
		modes.push('nostr');
	}
	return modes;
}
