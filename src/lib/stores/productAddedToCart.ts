import type { Currency } from '$lib/types/Currency';
import type { Picture } from '$lib/types/Picture';
import type { BasicProductFrontend } from '$lib/types/Product';
import { writable } from 'svelte/store';

export const productAddedToCart = writable<{
	product: BasicProductFrontend;
	picture: Picture | undefined;
	quantity: number;
	customPrice?: { amount: number; currency: Currency };
	chosenVariations?: Record<string, string>;
	depositPercentage?: number;
	discountPercentage?: number;
	widget?: unknown;
	priceMultiplier?: number;
} | null>(null);
