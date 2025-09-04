// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces

/// <reference types="@sveltejs/kit" />
/// <reference types="unplugin-icons/types/svelte" />

import type { LanguageKey } from '$lib/translations';
import type { CountryAlpha2 } from '$lib/types/Country';
import type { Role } from '$lib/types/Role';
import type { ObjectId } from 'mongodb';

declare global {
	namespace App {
		interface Error {
			status?: number;
		}
		interface Locals {
			status?: number;
			sessionId: string;
			countryCode?: CountryAlpha2;
			user?: {
				_id: ObjectId;
				login: string;
				roleId: string;
				role?: Role;
				alias?: string;
				hasPosOptions?: boolean;
			};
			email?: string;
			npub?: string;
			sso?: Array<{
				provider: string;
				email?: string;
				avatarUrl?: string;
				name: string;
				id: string;
			}>;
			clientIp?: string;
			acceptAgeLimitation?: boolean;
			language: LanguageKey;
		}
		// interface PageData {}
		// interface Platform {}
	}
}

export {};
