import { writable } from 'svelte/store';

export type CtiAddToCartState = 'idle' | 'loading' | 'success';

export const ctiAddToCartState = writable<CtiAddToCartState>('idle');
