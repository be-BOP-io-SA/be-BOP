export function trimSuffix(s: string, suffix: string): string {
	if (s.endsWith(suffix)) {
		return s.slice(0, s.length - suffix.length);
	}
	return s;
}
