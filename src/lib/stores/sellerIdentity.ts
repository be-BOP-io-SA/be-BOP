import { writable } from 'svelte/store';
import type { SellerIdentity } from '$lib/types/SellerIdentity';

export const sellerIdentity = writable<SellerIdentity | undefined>(undefined);
