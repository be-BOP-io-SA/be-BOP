// Temporary in-memory runtime log buffer.
// Patches process.stdout / process.stderr to intercept everything the app and
// its dependencies print. Exposed via /admin/logs. Cleared on restart.

export interface LogLine {
	at: Date;
	stream: 'stdout' | 'stderr';
	text: string;
}

const MAX_LINES = 1000;
const MAX_LINE_LEN = 8000;

const lines: LogLine[] = [];
let installed = false;

function push(stream: 'stdout' | 'stderr', raw: string) {
	// Split on newlines so each logical line is its own entry.
	const parts = raw.split(/\r?\n/);
	for (const part of parts) {
		if (part === '') continue;
		const text = part.length > MAX_LINE_LEN ? part.slice(0, MAX_LINE_LEN) + '…(truncated)' : part;
		lines.push({ at: new Date(), stream, text });
	}
	if (lines.length > MAX_LINES) {
		lines.splice(0, lines.length - MAX_LINES);
	}
}

export function installRuntimeLogCapture() {
	if (installed) return;
	installed = true;

	const origStdout = process.stdout.write.bind(process.stdout);
	const origStderr = process.stderr.write.bind(process.stderr);

	// @ts-expect-error overload signatures
	process.stdout.write = (chunk: unknown, ...rest: unknown[]) => {
		try {
			if (typeof chunk === 'string') push('stdout', chunk);
			else if (chunk instanceof Uint8Array) push('stdout', Buffer.from(chunk).toString('utf8'));
		} catch {
			/* never break logging */
		}
		// @ts-expect-error passthrough
		return origStdout(chunk, ...rest);
	};

	// @ts-expect-error overload signatures
	process.stderr.write = (chunk: unknown, ...rest: unknown[]) => {
		try {
			if (typeof chunk === 'string') push('stderr', chunk);
			else if (chunk instanceof Uint8Array) push('stderr', Buffer.from(chunk).toString('utf8'));
		} catch {
			/* never break logging */
		}
		// @ts-expect-error passthrough
		return origStderr(chunk, ...rest);
	};

	push('stdout', `[runtime-logs] capture installed at ${new Date().toISOString()}`);
}

export function getRecentLogs(): LogLine[] {
	return lines.slice();
}

export function clearLogs() {
	lines.length = 0;
}
