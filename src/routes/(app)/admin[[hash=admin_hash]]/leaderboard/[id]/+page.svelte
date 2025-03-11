<script lang="ts">
	import { CURRENCIES } from '$lib/types/Currency.js';
	import { MAX_NAME_LIMIT } from '$lib/types/Product';
	import { upperFirst } from '$lib/utils/upperFirst';
	import { MultiSelect } from 'svelte-multiselect';
	import { formatInTimeZone } from 'date-fns-tz';

	export let data;

	let beginsAt = formatInTimeZone(
		data.beginsAt,
		Intl.DateTimeFormat().resolvedOptions().timeZone,
		'yyyy-MM-dd HH:mm'
	);
	let endsAt = formatInTimeZone(
		data.endsAt,
		Intl.DateTimeFormat().resolvedOptions().timeZone,
		'yyyy-MM-dd HH:mm'
	);

	let endsAtElement: HTMLInputElement;
	let progressChanged = false;
	function checkForm(event: SubmitEvent) {
		if (endsAt < beginsAt) {
			endsAtElement.setCustomValidity('End date must be after beginning date');
			endsAtElement.reportValidity();
			event.preventDefault();
			return;
		} else {
			endsAtElement.setCustomValidity('');
		}
	}

	function confirmDelete(event: Event) {
		if (!confirm('Would you like to delete this leaderboard?')) {
			event.preventDefault();
		}
	}
</script>

<h1 class="text-3xl">Edit a leaderboard</h1>

<form method="post" class="flex flex-col gap-4" on:submit={checkForm}>
	<label class="form-label">
		Leaderboard slug for CMS integration
		<input type="text" disabled class="form-input" value={data.leaderboard._id} />
	</label>

	<label class="form-label">
		Leaderboard name
		<input
			class="form-input"
			type="text"
			maxlength={MAX_NAME_LIMIT}
			name="name"
			value={data.leaderboard.name}
			placeholder="leaderboard name"
			required
		/>
	</label>

	<label class="form-label">
		Mode
		<select class="form-input" value={data.leaderboard.mode} disabled>
			{#each ['moneyAmount', 'totalProducts'] as option}
				<option value={option}>{upperFirst(option)}</option>
			{/each}
		</select>
	</label>

	<h2 class="text-2xl">Progress</h2>
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="progressChanged"
			class="form-checkbox"
			bind:checked={progressChanged}
		/>
		Edit progress
	</label>
	{#each data.leaderboard.progress as progress, i}
		<h2 class="text-xl">{progress.productId}</h2>
		<div class="gap-4 flex flex-col md:flex-row">
			<input type="hidden" name="progress[{i}].productId" value={progress.productId} />

			<label class="w-full">
				amount
				<input
					class="form-input"
					type="number"
					name="progress[{i}].amount"
					placeholder="amount"
					step="any"
					value={progress.amount
						.toLocaleString('en', { maximumFractionDigits: 8 })
						.replace(/,/g, '')}
					required
					disabled={!progressChanged}
				/>
			</label>
			{#if data.leaderboard.mode === 'moneyAmount'}
				<label class="w-full">
					currency
					<select name="progress[{i}].currency" class="form-input" disabled={!progressChanged}>
						{#each CURRENCIES as currency}
							<option value={currency} selected={progress.currency === currency}>
								{currency}
							</option>
						{/each}
					</select>
				</label>
			{/if}
		</div>
	{/each}

	<label class="form-label">
		Beginning date

		<input
			class="form-input"
			type="datetime-local"
			name="beginsAt"
			bind:value={beginsAt}
			required
		/>
	</label>

	<label class="form-label">
		Ending date

		<input
			class="form-input"
			type="datetime-local"
			required
			name="endsAt"
			bind:value={endsAt}
			bind:this={endsAtElement}
			on:input={() => endsAtElement?.setCustomValidity('')}
		/>
	</label>

	<!-- svelte-ignore a11y-label-has-associated-control -->
	<label class="form-label">
		Products
		<MultiSelect
			disabled
			name="productIds"
			options={data.products.map((p) => ({ label: p.name, value: p._id }))}
			selected={data.leaderboard.productIds.map((productId) => ({
				value: productId,
				label: data.products.find((p) => p._id === productId)?.name ?? productId
			}))}
		/>
	</label>

	<div class="flex flex-row justify-between gap-2">
		<input type="submit" class="btn btn-blue text-white" formaction="?/update" value="Update" />
		<a href="/leaderboards/{data.leaderboard._id}" class="btn btn-gray">View</a>

		<input
			type="submit"
			class="btn btn-red text-white ml-auto"
			formaction="?/delete"
			value="Delete"
			on:click={confirmDelete}
		/>
	</div>
</form>
