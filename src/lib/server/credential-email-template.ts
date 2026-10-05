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
 * the credential could be copied into. Anything outside plain text and links is refused.
 */
export function isSafeCredentialTemplate(html: string, linkPlaceholder: string): boolean {
	if (!html.includes(linkPlaceholder)) {
		return false;
	}

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
		}
	}

	return true;
}
