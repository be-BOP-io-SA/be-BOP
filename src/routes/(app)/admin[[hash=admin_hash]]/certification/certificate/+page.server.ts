import { versionInfo } from '../version-info';

export function load() {
	return { ...versionInfo(), generatedAt: new Date(), layoutReset: true };
}
