import { browser } from '$app/environment';
import type { ThemeMode } from '$lib/types/Theme';
import { writable } from 'svelte/store';

const initialValue = browser
	? (window.localStorage.getItem('theme') as ThemeMode) ??
	  (document.documentElement.dataset.theme as ThemeMode) ??
	  'light'
	: 'light';

const theme = writable<ThemeMode>(initialValue);

theme.subscribe((value) => {
	if (!browser) {
		return;
	}

	window.localStorage.setItem('theme', value);

	if (value === 'light') {
		document.querySelector('html')?.classList.remove('dark');
	} else if (value === 'dark') {
		document.querySelector('html')?.classList.add('dark');
	} else if (value === 'system') {
		if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
			document.querySelector('html')?.classList.add('dark');
		} else {
			document.querySelector('html')?.classList.remove('dark');
		}
	}
});

export default theme;
