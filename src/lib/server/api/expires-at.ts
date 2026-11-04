/**
 * Parse an optional API-key expiration from the admin create form.
 *
 * Prefer an ISO-8601 value with timezone (`toISOString()` from the browser).
 * Fallback: datetime-local wall time + `expiresAtOffsetMinutes` (= `Date#getTimezoneOffset()`).
 */
export function parseExpiresAtFormValue(
	expiresAt: FormDataEntryValue | null | undefined,
	expiresAtOffsetMinutes: FormDataEntryValue | null | undefined,
	expiresAtLocal?: FormDataEntryValue | null | undefined
): { ok: true; value: Date | undefined } | { ok: false; message: string } {
	const isoRaw = typeof expiresAt === 'string' ? expiresAt.trim() : '';
	const localRaw =
		(typeof expiresAtLocal === 'string' ? expiresAtLocal.trim() : '') ||
		// Allow callers to pass datetime-local in the primary field when no ISO is present.
		(!/[zZ]|[+-]\d{2}:?\d{2}$/.test(isoRaw) ? isoRaw : '');

	if (isoRaw && /[zZ]|[+-]\d{2}:?\d{2}$/.test(isoRaw)) {
		const d = new Date(isoRaw);
		if (Number.isNaN(d.getTime())) {
			return { ok: false, message: 'Invalid expiration date' };
		}
		return { ok: true, value: d };
	}

	if (!localRaw) {
		return { ok: true, value: undefined };
	}

	// datetime-local: YYYY-MM-DDTHH:mm[:ss[.sss]]
	const localMatch = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/.exec(
		localRaw
	);
	if (localMatch) {
		const offsetRaw =
			typeof expiresAtOffsetMinutes === 'string' ? expiresAtOffsetMinutes.trim() : '';
		if (offsetRaw === '' || !/^-?\d+$/.test(offsetRaw)) {
			return { ok: false, message: 'Invalid expiration date' };
		}
		const offsetMinutes = Number(offsetRaw);
		const withSeconds = `${localMatch[1]}:${localMatch[2] ?? '00'}.${(
			localMatch[3] ?? '000'
		).padEnd(3, '0')}`;
		const asUtcMs = Date.parse(withSeconds + 'Z');
		if (Number.isNaN(asUtcMs)) {
			return { ok: false, message: 'Invalid expiration date' };
		}
		// getTimezoneOffset(): minutes to add to local wall time to obtain UTC.
		return { ok: true, value: new Date(asUtcMs + offsetMinutes * 60_000) };
	}

	return { ok: false, message: 'Invalid expiration date' };
}
