<script lang="ts">
	import { generateId } from '$lib/utils/generateId.js';
	import { applyAction, deserialize } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { preUploadPicture } from '$lib/types/Picture.js';
	import PictureComponent from '$lib/components/Picture.svelte';

	export let data;
	let enableCustomerTouchInterface = data.enableCustomerTouchInterface;
	let enableCustomerLogin = !!data.cti?.enableCustomerLogin;
	let categoryLines = data.cti?.categories?.length || 1;
	let labels: string[] = [];
	let slug: string[] = [];
	let submitting = false;

	let categoryPictures: FileList[] = [];
	let formElement: HTMLFormElement;

	function handleFileChange(event: Event, index: number) {
		const target = event.target as HTMLInputElement;
		if (target.files) {
			categoryPictures[index] = target.files;
		}
	}
	async function handleSubmit(event: SubmitEvent) {
		submitting = true;
		const formData = new FormData(formElement);
		try {
			await Promise.all(
				categoryPictures.map(async (picture, index) => {
					if (picture) {
						const pictureId = await preUploadPicture(data.adminPrefix, picture[0], {
							fileName: labels[index]
						});
						formData.set(`categoryPictures[${index}]`, pictureId);
					}
				})
			);
			const action = (event.submitter as HTMLButtonElement | null)?.formAction.includes('?/')
				? (event.submitter as HTMLButtonElement).formAction
				: formElement.action;

			const finalResponse = await fetch(action, {
				method: 'POST',
				body: formData
			});

			const result = deserialize(await finalResponse.text());

			if (result.type === 'success') {
				await invalidateAll();
			}

			applyAction(result);
		} finally {
			submitting = false;
		}
	}
	function deleteCategoryCti(categorySlug: string) {
		if (data.cti?.categories) {
			data.cti.categories = data.cti?.categories.filter(
				(category) => !(category.slug === categorySlug)
			);
			categoryLines -= 1;
		}
	}
	function closeDetailByIndex(i: number) {
		const detail = document.getElementById(`detail-${i}`);
		if (detail?.hasAttribute('open')) {
			detail.removeAttribute('open');
		}
	}
</script>

<h1 class="text-3xl">Customer Touch Interface</h1>
<form
	method="post"
	class="flex flex-col gap-6"
	bind:this={formElement}
	action="?/update"
	on:submit|preventDefault={handleSubmit}
>
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="enableCustomerTouchInterface"
			class="form-checkbox"
			bind:checked={enableCustomerTouchInterface}
		/>
		Enable Customer Touch Interface
	</label>
	{#if enableCustomerTouchInterface}
		<div class="grid grid-cols-3">
			<label class="form-label">
				Welcome CMS slug
				<select name="welcomeCmsSlug" class="form-input">
					{#each data.cmsPages as cms}
						<option value={cms._id} selected={cms._id === data.cti?.welcomeCmsSlug}>
							{cms._id}
						</option>
					{/each}
				</select>
			</label>
		</div>
		<label class="checkbox-label">
			<input
				type="checkbox"
				name="enableCustomerLogin"
				class="form-checkbox"
				bind:checked={enableCustomerLogin}
			/>
			Enable Customer Touch Interface
		</label>
		<label class="form-label">
			Timeout on dropped page before returning to welcome (in seconds).
			<input
				name="timeoutDroppedSeconds"
				type="number"
				min="5"
				class="form-input max-w-[25rem]"
				value={data.cti?.timeoutDroppedSeconds ?? 30}
			/>
		</label>
		<label class="form-label">
			Timeout to submit the verification code through Nostr (in seconds).
			<input
				name="timeoutNostrSeconds"
				type="number"
				min="10"
				class="form-input max-w-[25rem]"
				value={data.cti?.timeoutNostrSeconds ?? 10}
			/>
		</label>
		<h2 class="text-xl font-bold mt-4">Help Request Configuration</h2>
		<label class="form-label">
			Target npub for help requests (Nostr public key)
			<input
				name="helpRequestNpub"
				type="text"
				class="form-input max-w-[40rem]"
				placeholder="npub1..."
				value={data.cti?.helpRequestNpub ?? ''}
			/>
		</label>
		<label class="form-label">
			Cooldown before help can be requested again (in seconds).
			<input
				name="helpRequestCooldownSeconds"
				type="number"
				min="10"
				class="form-input max-w-[25rem]"
				value={data.cti?.helpRequestCooldownSeconds ?? 60}
			/>
		</label>
		{#each [...Array(categoryLines).keys()] as i}
			<details
				class="border border-gray-300 rounded-xl p-2"
				open={!data.cti?.categories?.[i]}
				id="detail-{i}"
			>
				<summary class="text-xl font-bold">
					<h1 class="items-center inline-flex gap-2">
						Category #{i + 1}

						<button
							type="button"
							on:click={() => deleteCategoryCti(data.cti?.categories?.[i].slug || '')}>🗑️</button
						>
					</h1>
				</summary>
				{#if data.cti?.categories && data.cti.categories.length >= i + 1}
					<div class="flex flex-col gap-4 mt-2">
						<div class="grid grid-cols-3">
							<label class="form-label">
								CMS slug
								<select name="categories[{i}].cmsSlug" class="form-input">
									{#each data.cmsPages as cms}
										<option value={cms._id} selected={cms._id === data.cti.categories[i].cmsSlug}>
											{cms._id}
										</option>
									{/each}
								</select>
							</label>
						</div>
						<label class="form-label">
							label
							<input
								name="categories[{i}].label"
								type="text"
								class="form-input"
								value={data.cti.categories[i].label}
							/>
						</label>
						<div class="grid grid-cols-3">
							<label class="form-label">
								Product tag
								<select name="categories[{i}].tagId" class="form-input">
									<option value="">-- Select a tag --</option>
									{#each data.tags as tag}
										<option value={tag._id} selected={tag._id === data.cti.categories[i].tagId}>
											{tag.name} ({tag._id})
										</option>
									{/each}
								</select>
							</label>
						</div>
						<input type="hidden" name="categories[{i}].slug" value={data.cti?.categories[i].slug} />
						<label class="checkbox-label">
							<input
								class="form-checkbox"
								type="checkbox"
								name="categories[{i}].isArchived"
								checked={data.cti?.categories[i].isArchived}
							/>
							Archive category
						</label>
						<label class="checkbox-label">
							<input
								class="form-checkbox"
								type="checkbox"
								name="categories[{i}].isCmsOnly"
								checked={data.cti?.categories[i].isCmsOnly}
							/>
							This is not a category, but a CMS-only page (no products)
						</label>
						<a
							href="{data.adminPrefix}/picture/new?ctiCategorySlug={data.cti.categories[i].slug}"
							class="underline"
						>
							Add picture
						</a>

						<div class="flex flex-row flex-wrap gap-6 mt-6">
							{#each data.pictures.filter((pic) => pic.ctiCategorySlug && pic.ctiCategorySlug === data.cti?.categories?.[i].slug) as picture}
								<div class="flex flex-col text-center">
									<a
										href="{data.adminPrefix}/picture/{picture._id}"
										class="flex flex-col items-center"
									>
										<PictureComponent
											{picture}
											class="h-36 block"
											style="object-fit: scale-down;"
										/>
										<span>{picture.name}</span>
									</a>
								</div>
							{/each}
						</div>
						<label class="form-label">
							Position
							<input
								type="number"
								name="categories[{i}].position"
								class="form-input"
								value={data.cti?.categories[i].position}
							/>
						</label>
						<div class="flex flex-row justify-between gap-2">
							<input
								type="submit"
								class="btn btn-blue text-white"
								formaction="?/update"
								value="Update"
							/>

							<input
								type="button"
								class="btn btn-red text-white ml-auto"
								value="Delete"
								on:click={() => {
									deleteCategoryCti(data.cti?.categories?.[i].slug || '');
									closeDetailByIndex(i);
								}}
							/>
						</div>
					</div>
				{:else}
					<div class="flex flex-col gap-4 mt-2">
						<div class="grid grid-cols-3">
							<label class="form-label">
								CMS slug
								<select name="categories[{i}].cmsSlug" class="form-input">
									{#each data.cmsPages as cms}
										<option value={cms._id}>
											{cms._id}
										</option>
									{/each}
								</select>
							</label>
						</div>
						<label class="form-label">
							label
							<input
								name="categories[{i}].label"
								type="text"
								class="form-input"
								bind:value={labels[i]}
								on:change={() => (slug[i] = generateId(labels[i], true).toLowerCase())}
								on:input={() => (slug[i] = generateId(labels[i], true).toLowerCase())}
							/>
						</label>
						<div class="grid grid-cols-3">
							<label class="form-label">
								Product tag
								<select name="categories[{i}].tagId" class="form-input">
									<option value="">-- Select a tag --</option>
									{#each data.tags as tag}
										<option value={tag._id}>
											{tag.name} ({tag._id})
										</option>
									{/each}
								</select>
							</label>
						</div>
						<input type="hidden" bind:value={slug[i]} name="categories[{i}].slug" />
						<label class="checkbox-label">
							<input class="form-checkbox" type="checkbox" name="categories[{i}].isArchived" />
							Archive category
						</label>
						<label class="checkbox-label">
							<input class="form-checkbox" type="checkbox" name="categories[{i}].isCmsOnly" />
							This is not a category, but a CMS-only page (no products)
						</label>
						<input
							type="file"
							accept="image/jpeg,image/png,image/webp"
							class="block"
							on:change={(e) => handleFileChange(e, i - (data.cti?.categories?.length || 0))}
							disabled={submitting}
						/>
						<label class="form-label">
							Position
							<input type="number" name="categories[{i}].position" class="form-input" />
						</label>
					</div>
				{/if}
			</details>
		{/each}
		<button class="btn body-mainCTA self-start" on:click={() => (categoryLines += 1)} type="button"
			>Add another category
		</button>
	{/if}

	<div class="flex flex-row justify-between gap-2">
		<input type="submit" class="btn btn-blue text-white" value="Update" disabled={submitting} />
	</div>
</form>
