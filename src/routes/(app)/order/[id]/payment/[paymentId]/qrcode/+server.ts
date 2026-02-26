import { collections } from '$lib/server/database';
import { rootDir } from '$lib/server/root-dir';
import { bitcoinPaymentQrCodeString } from '$lib/types/Order';
import { error } from '@sveltejs/kit';
import qrcode from 'qrcode';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { building } from '$app/environment';

const bebopLogoSvg = building ? '' : readFileSync(join(rootDir, 'assets/bebop-b.svg'), 'utf-8');

const BEBOP_LOGO_RATIO = 0.2;

export async function GET({ params, url }) {
	const order = await collections.orders.findOne({ _id: params.id });

	if (!order) {
		throw error(404, 'Order not found');
	}

	const payment = order.payments.find((payment) => payment._id.equals(params.paymentId));
	if (!payment) {
		throw error(404, 'Payment not found');
	}

	if (
		payment.method !== 'bitcoin' &&
		payment.method !== 'lightning' &&
		payment.method !== 'card' &&
		payment.method !== 'taler'
	) {
		throw error(400, 'Invalid payment method for QR Code generation');
	}

	if (!payment.address) {
		throw error(400, 'Payment address not found');
	}

	const address =
		payment.method === 'bitcoin'
			? bitcoinPaymentQrCodeString(payment.address, payment.price.amount, payment.price.currency)
			: payment.address;

	let qrcodeString = (await qrcode.toString(address, { type: 'svg' })).trim();

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
