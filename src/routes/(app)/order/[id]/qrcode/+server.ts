import { rootDir } from '$lib/server/root-dir';
import qrcode from 'qrcode';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { building } from '$app/environment';
import { ORIGIN } from '$lib/server/env-config';

const bebopLogoSvg = building ? '' : readFileSync(join(rootDir, 'assets/bebop-b.svg'), 'utf-8');

const BEBOP_LOGO_RATIO = 0.2;

export async function GET({ params, url }) {
	const address = `${ORIGIN}/order/${params.id}`;

	let qrcodeString = await qrcode.toString(address, { type: 'svg' });

	const showLogo = url.searchParams.get('logo') === 'true';

	if (showLogo) {
		const viewBox = qrcodeString.match(/viewBox="([^"]+)"/)?.[1];
		const logoViewBox = bebopLogoSvg.match(/viewBox="([^"]+)"/)?.[1];
		const logoWidgth = Number(bebopLogoSvg.match(/width="([^"]+)"/)?.[1]);
		const logoHeight = Number(bebopLogoSvg.match(/height="([^"]+)"/)?.[1]);

		if (viewBox && logoViewBox && !isNaN(logoWidgth) && !isNaN(logoHeight)) {
			const [x, y, width, height] = viewBox.split(' ').map(Number);
			// add logo to SVG

			const logoScale = Math.max(width / logoWidgth, height / logoHeight) * BEBOP_LOGO_RATIO;
			const logoX = x + (width - Number(logoWidgth) * logoScale) / 2;
			const logoY = y + (height - Number(logoHeight) * logoScale) / 2;

			const logoSvg = `<g transform="translate(${logoX},${logoY}) scale(${logoScale})">${bebopLogoSvg}</g>`;
			const whiteRectBg = `<rect x="${logoX}" y="${logoY}" width="${
				logoWidgth * logoScale
			}" height="${logoHeight * logoScale}" fill="white"/>`;
			if (qrcodeString.endsWith('</svg>')) {
				qrcodeString = qrcodeString.slice(0, -'</svg>'.length) + whiteRectBg + logoSvg + '</svg>';
			}
		}
	}

	return new Response(qrcodeString, {
		headers: { 'content-type': 'image/svg+xml' },
		status: 200
	});
}
