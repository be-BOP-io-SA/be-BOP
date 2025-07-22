import { nostrPublicKey } from '$lib/server/nostr';
import qrcode from 'qrcode';

export async function GET() {
	const qrCodeSvg = await qrcode.toString(`nostr:${nostrPublicKey}`, { type: 'svg' });

	return new Response(qrCodeSvg, {
		headers: { 'content-type': 'image/svg+xml' },
		status: 200
	});
}
