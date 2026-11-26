import { isIPv6 } from 'node:net';
import { ipToBuffer } from './ip';

export function toIPv4Maybe(ip: string): string {
	if (!isIPv6(ip)) {
		return ip;
	}

	const buffer = ipToBuffer(ip);

	if (
		buffer[0] === 0 &&
		buffer[1] === 0 &&
		buffer[2] === 0 &&
		buffer[3] === 0 &&
		buffer[4] === 0 &&
		buffer[5] === 0 &&
		buffer[6] === 0 &&
		buffer[7] === 0 &&
		buffer[8] === 0 &&
		buffer[9] === 0 &&
		buffer[10] === 255 &&
		buffer[11] === 255
	) {
		return `${buffer[12]}.${buffer[13]}.${buffer[14]}.${buffer[15]}`;
	}

	return ip;
}
