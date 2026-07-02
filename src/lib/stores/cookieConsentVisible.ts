import { writable } from 'svelte/store';

/**
 * Client-side override that forces the cookie consent banner to display even when the visitor
 * has already made a choice. Set to `true` by the 🍪 button in the footer and the equivalent
 * one on `/identity`; reset back to `false` once the visitor picks again.
 */
export const cookieConsentVisible = writable(false);
