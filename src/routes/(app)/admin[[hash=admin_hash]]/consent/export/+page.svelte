<script lang="ts">
	import { goto } from '$app/navigation';
	import { useI18n } from '$lib/i18n';

	export let data;

	const { t, locale } = useI18n();

	let copied = false;

	$: emails = data.customers.map((customer) => customer.email).filter(Boolean);
	$: selectedOptin = data.optins.find((optin) => optin.id === data.selectedId);

	function optinName(optin: { label: string; deleted: boolean }) {
		return optin.deleted ? `${optin.label} ${t('admin.consent.deletedSuffix')}` : optin.label;
	}

	function formatDate(iso: string) {
		return iso ? new Date(iso).toLocaleString($locale) : '';
	}

	function csvField(value: string) {
		return `"${value.replaceAll('"', '""')}"`;
	}

	function exportCsv() {
		const rows = [
			[t('admin.consent.email'), t('admin.consent.npub'), t('admin.consent.updatedAt')],
			...data.customers.map((customer) => [customer.email, customer.npub, customer.updatedAt])
		];
		const csv = rows.map((row) => row.map(csvField).join(',')).join('\n');
		const link = document.createElement('a');
		link.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
		link.setAttribute('download', `consent-${data.selectedId}.csv`);
		document.body.appendChild(link);
		link.click();
		link.remove();
	}

	async function copyEmails() {
		await navigator.clipboard.writeText(emails.join(', '));
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<h1 class="text-3xl">{t('admin.consent.title')}</h1>

<p class="text-gray-600">{t('admin.consent.description')}</p>

{#if data.optins.length}
	<label class="form-label">
		{t('admin.consent.optinSelect')}
		<select
			class="form-input"
			value={data.selectedId}
			on:change={(e) => goto(`?optin=${encodeURIComponent(e.currentTarget.value)}`)}
		>
			{#each data.optins as optin (optin.id)}
				<option value={optin.id}>{optinName(optin)}</option>
			{/each}
		</select>
	</label>

	<div class="flex flex-wrap gap-2 items-center">
		<button
			type="button"
			class="btn btn-black"
			disabled={!data.customers.length}
			on:click={exportCsv}
		>
			{t('admin.consent.exportCsv')}
		</button>
		<button type="button" class="btn btn-black" disabled={!emails.length} on:click={copyEmails}>
			{t('admin.consent.copyBcc')}
		</button>
		{#if copied}
			<span class="text-green-700">{t('admin.consent.copied')}</span>
		{/if}
	</div>

	{#if selectedOptin}
		<p>{t('admin.consent.count', { count: data.customers.length })}</p>
	{/if}

	{#if data.customers.length}
		<table class="w-full">
			<thead>
				<tr class="text-left">
					<th class="p-2">{t('admin.consent.email')}</th>
					<th class="p-2">{t('admin.consent.npub')}</th>
					<th class="p-2">{t('admin.consent.updatedAt')}</th>
				</tr>
			</thead>
			<tbody>
				{#each data.customers as customer}
					<tr class="border-t">
						<td class="p-2 break-all">{customer.email}</td>
						<td class="p-2 break-all">{customer.npub}</td>
						<td class="p-2 whitespace-nowrap">{formatDate(customer.updatedAt)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{:else}
		<p class="text-gray-500">{t('admin.consent.empty')}</p>
	{/if}
{:else}
	<p class="text-gray-500">{t('admin.consentOptins.empty')}</p>
{/if}
