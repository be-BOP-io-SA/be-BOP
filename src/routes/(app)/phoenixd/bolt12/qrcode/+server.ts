import { runtimeConfig } from '$lib/server/runtime-config';
import qrcode from 'qrcode';

export async function GET({}) {
	try {
		const bolt12Address = runtimeConfig.phoenixd.bolt12Address;

		const svgQRCode = await qrcode.toString('lightning:' + bolt12Address, { type: 'svg' });

		return new Response(svgQRCode, {
			headers: { 'content-type': 'image/svg+xml' },
			status: 200
		});
	} catch (error) {
		console.error('Error on phoenixdGetBolt12:', error);

		return new Response("Erreur lors de la génération de l'adresse Bolt12", {
			headers: { 'content-type': 'text/plain' },
			status: 500
		});
	}
}
