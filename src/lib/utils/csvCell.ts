/**
 * One CSV field, quoted when needed and disarmed as a spreadsheet formula.
 *
 * Exports carry what buyers typed at checkout, and a spreadsheet evaluates a field starting with
 * `=`, `+`, `-` or `@` as a formula. Plain numbers keep their sign so amount columns stay numeric.
 */
export function csvCell(value: string | number | null | undefined): string {
	let text = String(value ?? '');
	if (/^[=+\-@\t\r]/.test(text) && !/^[+-]?\d+([.,]\d+)?$/.test(text)) {
		text = `'${text}`;
	}
	return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
