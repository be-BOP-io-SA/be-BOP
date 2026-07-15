import type { EInvoicePlatform } from './types';
import { NullPlatform } from './contrib/NullPlatform';

const platforms = new Map<string, EInvoicePlatform>();

export function registerPlatform(platform: EInvoicePlatform): void {
	platforms.set(platform.meta.id, platform);
}

export function getPlatform(id: string): EInvoicePlatform {
	return platforms.get(id) ?? NullPlatform;
}

export function listPlatforms(): EInvoicePlatform[] {
	return [...platforms.values()];
}

registerPlatform(NullPlatform);
