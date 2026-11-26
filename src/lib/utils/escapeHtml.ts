const ENTITIES: Record<string, string> = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#39;'
};

/**
 * Escapes text for interpolation into an HTML document or e-mail body. `&` must be replaced
 * first, which the single pass guarantees.
 */
export function escapeHtml(value: string): string {
	return value.replace(/[&<>"']/g, (char) => ENTITIES[char]);
}
