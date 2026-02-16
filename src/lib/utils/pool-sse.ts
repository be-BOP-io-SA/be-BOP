import { fetchEventSource } from '@microsoft/fetch-event-source';
import { invalidate } from '$app/navigation';
import { UrlDependency } from '$lib/types/UrlDependency';
import { debounce } from '$lib/utils/debounce';

const SSE_DEBOUNCE_MS = 1000;

export function connectPoolSSE(slug: string, signal: AbortSignal): void {
	const debouncedInvalidate = debounce(
		() => invalidate(UrlDependency.orderTab(slug)),
		SSE_DEBOUNCE_MS
	);
	fetchEventSource(`/pos/touch/tab/${slug}/sse`, {
		signal,
		onmessage() {
			debouncedInvalidate();
		},
		onerror(err) {
			console.error(`Pool SSE error for tab ${slug}:`, err);
		}
	});
}
