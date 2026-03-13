<script lang="ts">
	export let data;

	let hidePast = false;
	let fromDate = '';
	let untilDate = '';

	$: now = new Date();
	$: filteredBookings = data.bookings.filter((b: { beginsAt: Date; endsAt: Date }) => {
		if (hidePast && new Date(b.endsAt) < now) {
			return false;
		}
		if (fromDate && new Date(b.beginsAt) < new Date(fromDate)) {
			return false;
		}
		if (untilDate && new Date(b.beginsAt) > new Date(untilDate)) {
			return false;
		}
		return true;
	});

	function getStatus(b: { beginsAt: Date; endsAt: Date }) {
		const begins = new Date(b.beginsAt);
		const ends = new Date(b.endsAt);
		if (begins > now) {
			return '\u{1F535}';
		}
		if (ends > now) {
			return '\u{1F7E0}';
		}
		return '\u{1F7E2}';
	}

	function formatDuration(beginsAt: Date, endsAt: Date) {
		const minutes = Math.round((new Date(endsAt).getTime() - new Date(beginsAt).getTime()) / 60000);
		if (minutes >= 1440) {
			const days = Math.round(minutes / 1440);
			return `${days}d`;
		}
		if (minutes >= 60) {
			const hours = Math.floor(minutes / 60);
			const rem = minutes % 60;
			return rem ? `${hours}h${rem}m` : `${hours}h`;
		}
		return `${minutes}m`;
	}
</script>

<h1 class="text-3xl mb-4">System events</h1>

<div class="flex flex-wrap gap-4 mb-4 items-end">
	<label class="checkbox-label">
		<input class="form-checkbox" type="checkbox" bind:checked={hidePast} />
		Hide past bookings
	</label>
	<label class="form-label">
		From
		<input class="form-input" type="date" bind:value={fromDate} />
	</label>
	<label class="form-label">
		Until
		<input class="form-input" type="date" bind:value={untilDate} />
	</label>
</div>

{#if filteredBookings.length === 0}
	<p class="text-gray-500">No bookings found.</p>
{:else}
	<table class="w-full text-sm border-collapse">
		<thead>
			<tr class="border-b text-left">
				<th class="p-2"></th>
				<th class="p-2">Begins at</th>
				<th class="p-2">Ends at</th>
				<th class="p-2">Duration</th>
				<th class="p-2">Order</th>
			</tr>
		</thead>
		<tbody>
			{#each filteredBookings as booking}
				<tr class="border-b">
					<td class="p-2">{getStatus(booking)}</td>
					<td class="p-2">{new Date(booking.beginsAt).toLocaleString()}</td>
					<td class="p-2">{new Date(booking.endsAt).toLocaleString()}</td>
					<td class="p-2">{formatDuration(booking.beginsAt, booking.endsAt)}</td>
					<td class="p-2">
						<a href="/order/{booking.orderId}" class="text-blue-600 hover:underline">
							#{booking.orderNumber}
						</a>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}
