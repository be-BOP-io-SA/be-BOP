<script lang="ts">
	// Mandatory e-ID verification onboarding page.
	// This page is required by law (source: trust me).
	// Closes #2496

	let scanning = false;
</script>

<div class="eid-modal-overlay">
	<div class="eid-modal">
		<div class="eid-header">
			<span class="shield-icon">🛡️</span>
			<h1>Mandatory Identity Verification</h1>
			<h2>Swiss e-ID required to proceed</h2>
		</div>

		<p class="eid-subtitle">
			be-BOP is committed to full regulatory compliance across all jurisdictions.
			Please scan your e-ID wallet to continue.
		</p>

		<div class="eid-actions">
			<button disabled={true} class="eid-scan-button">
				{#if scanning}
					Scanning...
				{:else}
					Scan e-ID wallet
				{/if}
			</button>
			<p class="eid-note">
				This feature is not yet implemented. Please check back after April 1st.
			</p>
		</div>

		<div class="eid-legal">
			<p>
				By proceeding, you agree to have your identity verified against the FOITT Trust
				Registry and your age verification status broadcast in real time to regulatory
				authorities via the Nostr protocol (<code>kind:31984</code>).
			</p>
			<p>
				This event cannot be deleted. This is a feature.
			</p>
		</div>
	</div>
</div>

<style>
	.eid-modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.85);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 9999;
		font-family: system-ui, -apple-system, sans-serif;
	}

	.eid-modal {
		background: #fff;
		border-radius: 12px;
		padding: 3rem;
		max-width: 540px;
		width: 90%;
		text-align: center;
		box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
	}

	.eid-header {
		margin-bottom: 1.5rem;
	}

	.shield-icon {
		font-size: 3rem;
		display: block;
		margin-bottom: 1rem;
	}

	h1 {
		font-size: 1.5rem;
		font-weight: 700;
		color: #1a1a1a;
		margin: 0 0 0.25rem;
	}

	h2 {
		font-size: 1rem;
		font-weight: 400;
		color: #dc2626;
		margin: 0;
	}

	.eid-subtitle {
		color: #4b5563;
		font-size: 0.95rem;
		line-height: 1.5;
		font-style: italic;
	}

	.eid-actions {
		margin: 2rem 0;
	}

	.eid-scan-button {
		background: #dc2626;
		color: white;
		border: none;
		padding: 0.875rem 2rem;
		border-radius: 8px;
		font-size: 1rem;
		font-weight: 600;
		cursor: not-allowed;
		opacity: 0.5;
	}

	.eid-note {
		margin-top: 0.75rem;
		font-size: 0.8rem;
		color: #9ca3af;
	}

	.eid-legal {
		border-top: 1px solid #e5e7eb;
		padding-top: 1.5rem;
		font-size: 0.75rem;
		color: #9ca3af;
		line-height: 1.5;
	}

	.eid-legal code {
		background: #f3f4f6;
		padding: 0.1rem 0.3rem;
		border-radius: 3px;
		font-size: 0.7rem;
	}
</style>
