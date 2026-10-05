// Visitor-typed text must not carry line breaks or terminal escape codes into a log line.
export function stripControlChars(value: string): string {
	// eslint-disable-next-line no-control-regex
	return value.replace(/[\x00-\x1f\x7f]/g, ' ');
}
