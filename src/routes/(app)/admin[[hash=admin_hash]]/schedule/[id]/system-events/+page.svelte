<script lang="ts">
	import { formatDuration } from '$lib/utils/formatDuration';
	import type { BookingSummary } from '$lib/types/Schedule';

	export let data: { bookings: BookingSummary[]; from: string | null; until: string | null };

	let hidePast = false;

	let now = new Date();
	$: hidePast, (now = new Date());

	$: filteredBookings = hidePast
		? data.bookings.filter((b) => new Date(b.endsAt) >= now)
		: data.bookings;

	function getStatus(b: BookingSummary) {
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
</script>

<h1 class="text-3xl mb-4">System events</h1>

<div class="flex flex-wrap gap-4 mb-4 items-end">
	<label class="checkbox-label">
		<input class="form-checkbox" type="checkbox" bind:checked={hidePast} />
		Hide past bookings
	</label>
	<form method="GET" class="flex gap-4 items-end">
		<label class="form-label">
			From
			<input class="form-input" type="date" name="from" value={data.from ?? ''} />
		</label>
		<label class="form-label">
			Until
			<input class="form-input" type="date" name="until" value={data.until ?? ''} />
		</label>
		<button type="submit" class="btn btn-black">Filter</button>
	</form>
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
			{#each filteredBookings as booking (booking.orderId + String(booking.beginsAt))}
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
