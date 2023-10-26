// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces

/// <reference types="@sveltejs/kit" />
/// <reference types="unplugin-icons/types/svelte" />

import type { ObjectId } from 'mongodb';

declare global {
	namespace App {
		interface Error {
			status?: number;
		}
		interface Locals {
			status?: number;
			sessionId: string;
			countryCode: string;
			user?: { _id: ObjectId; login: string; role: string };
			email?: string;
			npub?: string;
			sso?: Array<{
				provider: string;
				email?: string;
				avatarUrl?: string;
				name: string;
				id: string;
			}>;
			clientIP?: string;
		}
		// interface PageData {}
		// interface Platform {}
	}
}

export {};
