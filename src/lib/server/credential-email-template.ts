/**
 * The templates that carry a login credential (reset or session link), with its placeholder.
 * Whoever edits one can send the credential elsewhere, and so takes over the account it is for.
 */
export const CREDENTIAL_TEMPLATE_LINKS = {
	passwordReset: '{{resetLink}}',
	temporarySessionRequest: '{{sessionLink}}'
} as const;

const PLAIN_TAGS = new Set([
	'p',
	'br',
	'a',
	'strong',
	'b',
	'em',
	'i',
	'u',
	'ul',
	'ol',
	'li',
	'div',
	'span',
	'h1',
	'h2',
	'h3',
	'h4',
	'blockquote',
	'small'
]);

/**
 * A template that mails a login credential is only safe if the link can go nowhere but to
 * the placeholder: no remote resource (image, style, frame, script) and no other URL that
 * the credential could be copied into. Anything outside plain text and links is refused, and
 * the placeholder may only appear as the whole href of a link.
 */
export function isSafeCredentialTemplate(html: string, linkPlaceholder: string): boolean {
	if (!html.includes(linkPlaceholder)) {
		return false;
	}

	let placeholderHrefs = 0;

	for (const [, closing, name, attributes] of html.matchAll(/<(\/?)([a-zA-Z][\w:-]*)([^>]*)>/g)) {
		if (!PLAIN_TAGS.has(name.toLowerCase())) {
			return false;
		}
		if (closing) {
			continue;
		}
		for (const [, attribute, quoted, singleQuoted, bare] of attributes.matchAll(
			/([^\s=/"']+)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g
		)) {
			const attributeName = attribute.toLowerCase();
			if (attributeName === 'class') {
				continue;
			}
			const value = quoted ?? singleQuoted ?? bare;
			if (!(attributeName === 'href' && name.toLowerCase() === 'a' && value === linkPlaceholder)) {
				return false;
			}
			placeholderHrefs++;
		}
	}

	const hrefsInTags = [...html.matchAll(/<[^>]*>/g)].reduce(
		(count, [tag]) => count + countInsensitive(tag, linkPlaceholder),
		0
	);
	if (hrefsInTags !== placeholderHrefs) {
		return false;
	}

	// As text the link is safe only as a word of its own: glued to other text, a mail client
	// reads both as one URL and sends the credential there. Inline tags join their neighbours.
	const text = html
		.replace(/<\/?(p|br|div|li|ul|ol|h[1-4]|blockquote)\b[^>]*>/gi, '\n')
		.replace(/<[^>]*>/g, '');
	const standalone = new RegExp(`(^|\\s)${escapeRegExp(linkPlaceholder)}(?=\\s|$)`, 'g');
	// Variables are substituted case-insensitively, so any other spelling also carries the link.
	return countInsensitive(text, linkPlaceholder) === [...text.matchAll(standalone)].length;
}

function countInsensitive(haystack: string, needle: string): number {
	return haystack.toLowerCase().split(needle.toLowerCase()).length - 1;
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
