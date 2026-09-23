const SAFE_PROTOCOLS = new Set([
	'http:',
	'https:',
	'mailto:',
	'tel:',
	'bitcoin:',
	'lightning:',
	'lnurl:'
]);

// The named entities that can forge or split a scheme. `&amp;` is deliberately absent: it is
// ordinary in query strings, and a browser decodes an attribute once, so `&amp;colon;` yields
// the literal text `&colon;` rather than a colon.
const SCHEME_ENTITIES: Record<string, string> = {
	colon: ':',
	Tab: '\t',
	NewLine: '\n',
	sol: '/',
	semi: ';'
};

// A browser decodes entities before resolving a URL, so `javascript&#58;alert(1)` and
// `javascript&colon;alert(1)` are live schemes even though neither holds a colon. Compare on the
// decoded form.
// An out-of-range code point makes `fromCodePoint` throw; the entity is not one a browser would
// decode either, so it stays as written rather than taking the caller down with it.
function codePoint(value: number, raw: string) {
	try {
		return String.fromCodePoint(value);
	} catch {
		return raw;
	}
}

function decodeEntities(value: string) {
	return value
		.replace(/&#x([0-9a-f]+);?/gi, (match, hex) => codePoint(parseInt(hex, 16), match))
		.replace(/&#(\d+);?/g, (match, dec) => codePoint(Number(dec), match))
		.replace(/&([a-z][a-z0-9]*);?/gi, (match, name) =>
			// Plain indexing would reach `Object.prototype`, so `&constructor;` would decode to a
			// function rather than staying literal.
			Object.hasOwn(SCHEME_ENTITIES, name) ? SCHEME_ENTITIES[name] : match
		);
}

export function isSafeUrl(href: string): boolean {
	// A browser drops control characters and spaces while parsing a scheme, so `java\nscript:`
	// runs: strip them here too, rather than vetting a string the parser will never see.
	const candidate = [...decodeEntities(href)]
		.filter((char) => (char.codePointAt(0) ?? 0) > 0x20)
		.join('');

	if (!/^[a-z][a-z0-9+.-]*:/i.test(candidate)) {
		return true;
	}

	try {
		return SAFE_PROTOCOLS.has(new URL(candidate).protocol);
	} catch {
		return false;
	}
}

/**
 * Resolves an operator-authored link target: a bare slug becomes site-relative, and a scheme
 * outside the allowlist yields `#` rather than a live `javascript:` href.
 */
export function safeHref(href: string | undefined | null): string {
	if (!href) {
		return '#';
	}

	const hasSchemeOrPath = href.includes('/') || /^[a-z][a-z0-9+.-]*:/i.test(href);
	const candidate = hasSchemeOrPath ? href : `/${href}`;

	return isSafeUrl(candidate) ? candidate : '#';
}
