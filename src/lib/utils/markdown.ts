import { marked } from 'marked';
import { isSafeUrl } from './safeUrl';

const renderer = new marked.Renderer();
const renderLink = renderer.link.bind(renderer);
const renderImage = renderer.image.bind(renderer);

// Dropping the markup but keeping the label: a rejected link still reads as written.
renderer.link = (href, title, text) =>
	isSafeUrl(href ?? '') ? renderLink(href, title, text) : text;
renderer.image = (href, title, text) =>
	isSafeUrl(href ?? '') ? renderImage(href, title, text) : text;

/**
 * Renders operator-authored markdown for `{@html}`. Escaping `<` blocks raw HTML, but markdown's
 * own link syntax still emits attributes, so link targets are checked against a scheme allowlist.
 */
export function renderMarkdown(content: string): string {
	return marked(content.replaceAll('<', '&lt;'), { renderer });
}
