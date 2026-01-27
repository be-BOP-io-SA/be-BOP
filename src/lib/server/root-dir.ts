import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, normalize } from 'path/posix';

export const rootDir = (() => {
	let currentPath = import.meta.url.startsWith('file://')
		? fileURLToPath(import.meta.url)
		: import.meta.url;

	while (currentPath !== '/') {
		if (existsSync(join(currentPath, 'package.json'))) {
			return currentPath;
		}

		currentPath = normalize(join(currentPath, '..'));
	}

	return '/';
})();
