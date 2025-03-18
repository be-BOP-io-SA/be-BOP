<script lang="ts">
	import type { Picture } from '$lib/types/Picture';
	import type { Schedule } from '$lib/types/Schedule';
	import PictureComponent from '../Picture.svelte';
	import { useI18n } from '$lib/i18n';

	export let pictures: Picture[] | [];
	export let schedule: Schedule;
	let className = '';
	export { className as class };
	$: pictureByEventSlug = Object.fromEntries(
		pictures.map((picture) => [picture.schedule?.eventSlug, picture])
	);
	const { t, locale } = useI18n();
</script>

{#each schedule.events as event}
	<div
		class="flex {event.beginsAt < new Date()
			? 'flex-row-reverse'
			: 'flex-row'} gap-4 tagWidget tagWidget-main w-full {className}"
	>
		<div class="grow">
			<PictureComponent
				picture={pictureByEventSlug[event.slug]}
				class="h-[280px] ml-auto object-contain"
			/>
		</div>
		<div class="p-4 grow-[2] w-2/3">
			<a href={event.url}>
				<h2 class="text-2xl font-bold body-title mb-2">
					{event.title}
				</h2>
			</a>
			<p class="text-sm text-gray-600">
				{event.beginsAt.toLocaleDateString($locale, {
					weekday: 'long',
					day: 'numeric',
					month: 'long',
					year: 'numeric'
				})}
			</p>

			<p class="font-semibold text-sm mt-2">{event.shortDescription}</p>

			<p class="text-sm text-gray-700 mt-2">
				{event.description}
			</p>

			<a
				href={event.url}
				class="btn cartPreview-secondaryCTA text-xl text-center w-full md:w-[150px] p-1 mt-2"
			>
				More Info
			</a>
		</div>
	</div>
{/each}
