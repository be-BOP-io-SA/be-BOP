import { browser } from '$app/environment';
import { writable } from 'svelte/store';

const initialValue = browser
	? document.querySelector('html')?.classList.contains('dark')
		? 'dark'
		: window.matchMedia('(prefers-color-scheme: dark)').matches
		? 'dark'
		: 'light'
	: 'light';

const theme = writable<'light' | 'dark'>(initialValue);

theme.subscribe((value: string) => {
	if (browser) {
		if (value === 'light') {
			document.querySelector('html')?.classList.remove('dark');
		} else {
			document.querySelector('html')?.classList.add('dark');
		}
	}
});

export default theme;
