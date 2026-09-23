import { describe, expect, it } from 'vitest';
import { serializeSchema } from './jsonLd';

describe('serializeSchema', () => {
	it('keeps the payload readable by a JSON parser', () => {
		const html = serializeSchema({ '@type': 'Product', name: 'Mug' });
		const json = html.slice(html.indexOf('>') + 1, html.lastIndexOf('</script>'));

		expect(JSON.parse(json)).toEqual({ '@type': 'Product', name: 'Mug' });
	});

	it('cannot be closed early by a crafted field', () => {
		const html = serializeSchema({
			'@type': 'Product',
			name: '</script><img src=x onerror=alert(1)>'
		});

		expect(html.match(/<\/script>/g)).toHaveLength(1);
		expect(html).not.toContain('<img');

		const json = html.slice(html.indexOf('>') + 1, html.lastIndexOf('</script>'));
		expect(JSON.parse(json).name).toBe('</script><img src=x onerror=alert(1)>');
	});
});
