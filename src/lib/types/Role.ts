import { adminLinks } from '../../routes/(app)/admin[[hash=admin_hash]]/adminLinks';
import type { Timestamps } from './Timestamps';
import { CUSTOMER_ROLE_ID } from './User';

export interface Role extends Timestamps {
	_id: string;
	name: string;
	hasPosOptions?: boolean;
	permissions: {
		read: string[];
		write: string[];
		forbidden: string[];
	};
}

export const defaultRoleOptions = [
	'/admin/*',
	...adminLinks
		.map((section) =>
			section.links.flatMap((link) => [link.href + '/*', ...(link.endpoints ?? [])])
		)
		.flat()
];

function matchPath(path: string, pattern: string): boolean {
	const parts = path.split('/');
	const patternParts = pattern.split('/');

	for (let i = 0; i < Math.max(patternParts.length, parts.length); i++) {
		if (patternParts[i] === '*') {
			if (i === patternParts.length - 1) {
				return true;
			}
			if (parts[i] === undefined) {
				return false;
			} else {
				continue;
			}
		}

		if (patternParts[i].startsWith(':')) {
			if (parts[i] === undefined) {
				return false;
			} else {
				continue;
			}
		}

		if (patternParts[i] !== parts[i]) {
			return false;
		}
	}

	return true;
}

export function isAllowedOnPage(role: Role, path: string, mode: 'read' | 'write'): boolean {
	path = path.replace(/^\/admin-[a-zA-Z0-9]+/, '/admin');
	if (path === '/admin' && role._id !== CUSTOMER_ROLE_ID) {
		return true;
	}

	if (role.permissions.forbidden.find((forbidden) => matchPath(path, forbidden))) {
		return false;
	}

	if (role.permissions.write.find((write) => matchPath(path, write))) {
		return true;
	}

	if (mode === 'read') {
		if (role.permissions.read.find((read) => matchPath(path, read))) {
			return true;
		}
	}

	return false;
}
