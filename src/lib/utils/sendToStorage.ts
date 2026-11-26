export type StorageUploadFailure = 'tooLarge' | 'sessionExpired' | 'storageRefused';

/**
 * Asks the admin server where to put `file`, then sends it there. The failure tells the admin
 * whose side to look at: the file, their session, or the storage.
 */
export async function sendToStorage<Prepared extends { uploadUrl: string }>(
	file: File,
	prepare: { url: string; body: Record<string, unknown>; maxSize: number }
): Promise<{ prepared: Prepared } | { failure: StorageUploadFailure }> {
	if (file.size > prepare.maxSize) {
		return { failure: 'tooLarge' };
	}

	try {
		const response = await fetch(prepare.url, {
			method: 'POST',
			body: JSON.stringify(prepare.body),
			headers: {
				'Content-Type': 'application/json'
			}
		});

		// The admin guard answers an expired session with a redirect to the login page, which fetch follows.
		if (response.redirected) {
			return { failure: 'sessionExpired' };
		}
		if (response.status === 413) {
			return { failure: 'tooLarge' };
		}
		if (!response.ok) {
			throw new Error(await response.text());
		}

		const prepared: Prepared = await response.json();

		// A storage refusal often lacks CORS headers, so the browser reports it as a network error.
		const uploadResponse = await fetch(prepared.uploadUrl, {
			method: 'PUT',
			body: file
		});

		if (!uploadResponse.ok) {
			throw new Error(await uploadResponse.text());
		}
		return { prepared };
	} catch (err) {
		console.error('Upload to the storage failed:', err);
		return { failure: 'storageRefused' };
	}
}
