<script lang="ts">
	import { CONSENT_OPTIN_FIELD } from '$lib/types/ConsentOptin';

	/** The solicitation opt-ins offered on checkout and the identity page, unticked unless accepted. */
	export let optins: Array<{ id: string; label: string }>;
	export let acceptedIds: string[];
</script>

{#each optins as optin (optin.id)}
	<label class="checkbox-label col-span-3">
		<input
			class="form-checkbox"
			type="checkbox"
			checked={acceptedIds.includes(optin.id)}
			name={CONSENT_OPTIN_FIELD}
			value={optin.id}
		/>
		{optin.label}
	</label>
{/each}
