/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
export function debounce<T extends (...args: any[]) => any>(
	fn: T,
	wait: number,
	opts?: { leading?: boolean }
): (...args: Parameters<T>) => void {
	let timeout: ReturnType<typeof setTimeout> | undefined = undefined;

	return function (...args: Parameters<T>): void {
		if (opts?.leading && !timeout) {
			fn(...args);
			timeout = setTimeout(() => {
				timeout = undefined;
			}, wait);
			return;
		}

		const later = () => {
			timeout = undefined;
			return fn(...args) as ReturnType<T>;
		};

		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
	};
}
