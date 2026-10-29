// A negative elapsed time means the system clock went back, so the window is treated as over.
export function isWithin(windowMs: number, since: number, now = Date.now()): boolean {
	const elapsed = now - since;
	return elapsed >= 0 && elapsed < windowMs;
}
