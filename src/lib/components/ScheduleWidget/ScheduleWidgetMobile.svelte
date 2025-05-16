<script lang="ts">
	import type { Picture } from '$lib/types/Picture';
	import type { Schedule } from '$lib/types/Schedule';
	import PictureComponent from '../Picture.svelte';
	import { useI18n } from '$lib/i18n';
	import { upperFirst } from '$lib/utils/upperFirst';
	import { addMinutes, isSameDay } from 'date-fns';
	import IconRssFeed from '../icons/IconRssFeed.svelte';
	import IcsExport from './IcsExport.svelte';
	import { toZonedTime } from 'date-fns-tz';

	export let pictures: Picture[] = [];
	export let schedule: Schedule;
	let className = '';
	export { className as class };
	$: pictureByEventSlug = Object.fromEntries(
		pictures.map((picture) => [picture.schedule?.eventSlug, picture])
	);
	const { t, locale } = useI18n();
</script>

{#if schedule.allowSubscription}
	<div class="max-w-md mx-auto flex flex-row">
		<a
			href="/schedule/{schedule._id}/subscribe"
			class="btn btn-gray no-underline text-xl text-center whitespace-nowrap p-2 mt-2"
		>
			🔔 {t('schedule.subscribeCTA')}
		</a>
	</div>
{/if}
{#each schedule.events as event}
	<div class="max-w-md mx-auto space-y-6 {className} {event.hideFromList ? 'hidden' : ''}">
		<div class="tagWidget tagWidget-main rounded-lg gap-4">
			<div class="flex items-center justify-center rounded-md">
				<PictureComponent
					picture={pictureByEventSlug[event.slug]}
					class="object-contain h-[15em] w-auto {(event.endsAt && event.endsAt < new Date()) ||
					addMinutes(new Date(event.beginsAt), schedule.pastEventDelay) < new Date()
						? 'opacity-50'
						: ''}"
				/>
			</div>
			<div class="flex flex-col items-center justify-center p-2 m-4 gap-2">
				<h2 class="text-2xl body-title flex flex-row">
					{event.title}
					<a title="Provide rss feed" href="/schedule/{schedule._id}/rss.xml" target="_blank">
						<IconRssFeed />
					</a>
				</h2>
				<p class="text-xl">
					{upperFirst(
						event.beginsAt.toLocaleDateString($locale, {
							weekday: 'long',
							day: 'numeric',
							month: 'long',
							year: 'numeric'
						})
					)}
					{#if event.endsAt && isSameDay(event.endsAt, event.beginsAt)}
						{t('schedule.dateText', {
							beginTime: toZonedTime(
								event.beginsAt,
								schedule.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
							).toLocaleTimeString($locale, {
								hour: '2-digit',
								minute: '2-digit'
							}),
							endTime: toZonedTime(
								event.endsAt,
								schedule.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
							).toLocaleTimeString($locale, {
								hour: '2-digit',
								minute: '2-digit'
							})
						})}
					{:else if event.endsAt && !isSameDay(event.endsAt, event.beginsAt)}
						{t('schedule.differentDayText', {
							beginDate: toZonedTime(
								event.beginsAt,
								schedule.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
							).toLocaleTimeString($locale, {
								hour: '2-digit',
								minute: '2-digit'
							}),
							endDate: toZonedTime(
								event.endsAt,
								schedule.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
							).toLocaleTimeString($locale, {
								weekday: 'long',
								day: 'numeric',
								month: 'long',
								year: 'numeric',
								hour: '2-digit',
								minute: '2-digit'
							})
						})}
					{:else}
						{t('schedule.uniqueDateText', {
							beginTime: toZonedTime(
								event.beginsAt,
								schedule.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
							).toLocaleTimeString($locale, {
								hour: '2-digit',
								minute: '2-digit'
							})
						})}
					{/if}
					{#if event.location?.name}
						- <a href={event.location.link} target="_blank" class="body-hyperlink"
							>{event.location.name}</a
						>
					{/if}
					{#if event.unavailabity?.isUnavailable}
						<span class="font-bold">[{event.unavailabity.label}]</span>
					{/if}
				</p>
				{#if event.url}
					<a href={event.url} target="_blank" class="btn cartPreview-secondaryCTA w-full">
						{t('schedule.moreInfo')}
					</a>
				{/if}
				{#if event.rsvp?.target && event.endsAt && event.endsAt > new Date()}
					<a
						href="/schedule/{schedule._id}/rsvp/{event.slug}"
						target="_blank"
						class="btn cartPreview-secondaryCTA w-full"
					>
						RSVP
					</a>
				{/if}
				<IcsExport {event} pastEventDelay={schedule.pastEventDelay} />
			</div>
		</div>
	</div>
{/each}
