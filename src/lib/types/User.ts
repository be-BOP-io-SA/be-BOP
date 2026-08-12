export async function checkPasswordPwnedTimes(password: string): Promise<number> {
	if (browser && !crypto?.subtle) {
		// Don't block if the browser blocks the crypto API due to non-secure context
		return 0;
	}
	const sha1 = crypto.subtle.digest('SHA-1', new TextEncoder().encode(password));
	const sha1Hex = Array.from(new Uint8Array(await sha1))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('')
		.toUpperCase();

	// HP-2026-08-12 (Peak Learn) : fail-open contrôlé. Le commentaire upstream
	// « Don't block the user if the API is down » n'était pas implémenté : un
	// fetch sans catch ni timeout transformait une API HIBP injoignable en
	// erreur 500 bloquant le login admin (conteneur sans egress Internet).
	// Désormais : timeout court (3s) + toute erreur réseau => 0 (non bloquant).
	let pwnedPasswordResp: Response;
	try {
		pwnedPasswordResp = await fetch(
			`https://api.pwnedpasswords.com/range/${sha1Hex.slice(0, 5)}`,
			{
				signal: AbortSignal.timeout(3000),
				autoSelectFamily: true
			} as unknown as RequestInit
		);
	} catch {
		// API injoignable (réseau coupé, timeout) : ne bloque jamais le login.
		return 0;
	}
	if (!pwnedPasswordResp.ok) {
		// Don't block the user if the API is down
		return 0;
	}
	if (pwnedPasswordResp.ok) {
		const pwnedPasswords = await pwnedPasswordResp.text().then((r) => r.split('\n'));
		const pwnedPassword = pwnedPasswords.find((line) => line.startsWith(sha1Hex.slice(5)));

		if (pwnedPassword) {
			return parseInt(pwnedPassword.split(':')[1]);
		}
	}
	return 0;
}
