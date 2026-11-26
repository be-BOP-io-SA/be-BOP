export function match(param) {
	// Anchored: unanchored, this also matched prefixes like `x-1`, routing `/adminx-1/...` into
	// the admin tree under a shape the hook's own guard does not recognise as admin.
	return /^-[a-zA-Z0-9]+$/.test(param);
}
