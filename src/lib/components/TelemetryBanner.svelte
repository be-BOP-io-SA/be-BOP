<script lang="ts">
	import { onDestroy } from 'svelte';
	import { useI18n } from '$lib/i18n';
	import { enhance } from '$app/forms';
	import DEFAULT_LOGO from '$lib/assets/bebop-light.svg';

	export let adminPrefix: string;
	export let nostrConfigured: boolean;

	const { t } = useI18n();

	type ViewState = 'initial' | 'accepted' | 'declined' | 'hidden' | 'minimal-accepted';

	let currentView: ViewState = 'initial';
	let countdownSeconds = 0;
	let countdownInterval: ReturnType<typeof setInterval> | null = null;

	function updateCountdown() {
		countdownSeconds--;
		if (countdownSeconds <= 0) {
			if (countdownInterval) {
				clearInterval(countdownInterval);
			}
			currentView = currentView === 'accepted' ? 'minimal-accepted' : 'hidden';
		}
	}

	onDestroy(() => {
		if (countdownInterval) {
			clearInterval(countdownInterval);
		}
	});
</script>

{#if currentView !== 'hidden'}
	<h1 class="text-xl mb-0 flex items-center gap-2">
		<span>{t('telemetry.banner.aWordFrom')}</span><img
			src={DEFAULT_LOGO}
			alt="be-BOP"
			class="mb-3 h-10 inline-block align-middle"
		/><span>:</span>
	</h1>

	{#if currentView === 'minimal-accepted'}
		<p class="text-sm mt-2 mb-6">
			{t('telemetry.banner.accepted.thankYou')}
		</p>
	{:else}
		<div class="p-6 mb-6 border border-gray-200 rounded-lg bg-white shadow-sm">
			<div class="flex items-start gap-4 mb-4">
				<div class="flex-shrink-0 w-[80px] ml-3">
					<svg
						class="h-16 w-16"
						viewBox="0 0 100 100"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<circle cx="50" cy="50" r="8" fill="#31A5DC" />
						<path
							d="M 35 35 Q 30 40, 35 45"
							stroke="#1683f7"
							stroke-width="3"
							fill="none"
							stroke-linecap="round"
						/>
						<path
							d="M 65 35 Q 70 40, 65 45"
							stroke="#31A5DC"
							stroke-width="3"
							fill="none"
							stroke-linecap="round"
						/>
						<path
							d="M 25 25 Q 18 40, 25 55"
							stroke="#31A5DC"
							stroke-width="3"
							fill="none"
							stroke-linecap="round"
						/>
						<path
							d="M 75 25 Q 82 40, 75 55"
							stroke="#31A5DC"
							stroke-width="3"
							fill="none"
							stroke-linecap="round"
						/>
						<path
							d="M 15 15 Q 5 40, 15 65"
							stroke="#31A5DC"
							stroke-width="3"
							fill="none"
							stroke-linecap="round"
						/>
						<path
							d="M 85 15 Q 95 40, 85 65"
							stroke="#31A5DC"
							stroke-width="3"
							fill="none"
							stroke-linecap="round"
						/>
						<line
							x1="50"
							y1="58"
							x2="50"
							y2="85"
							stroke="#31A5DC"
							stroke-width="4"
							stroke-linecap="round"
						/>
						<line
							x1="50"
							y1="85"
							x2="35"
							y2="95"
							stroke="#31A5DC"
							stroke-width="4"
							stroke-linecap="round"
						/>
						<line
							x1="50"
							y1="85"
							x2="65"
							y2="95"
							stroke="#31A5DC"
							stroke-width="4"
							stroke-linecap="round"
						/>
					</svg>
				</div>
				<div class="flex-1">
					<div class="space-y-2 text-sm">
						<p>{t('telemetry.banner.description1')}</p>
						<p>{t('telemetry.banner.description2')}</p>
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						<p class="font-semibold">{@html t('telemetry.banner.description3')}</p>
						<p class="font-semibold">{t('telemetry.banner.question')}</p>
					</div>
				</div>
			</div>

			{#if currentView === 'initial'}
				<div class="flex gap-4">
					<form
						method="post"
						action="{adminPrefix}?/telemetry"
						use:enhance={() => {
							currentView = 'accepted';
							countdownSeconds = 10;
							countdownInterval = setInterval(updateCountdown, 1000);
							return async () => {};
						}}
					>
						<input type="hidden" name="choice" value="accept" />
						<button
							type="submit"
							disabled={!nostrConfigured}
							class="btn bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{t('telemetry.banner.acceptButton')}
						</button>
					</form>

					{#if !nostrConfigured}
						<a href="{adminPrefix}/nostr" class="btn bg-blue-600 text-white hover:bg-blue-700">
							{t('telemetry.banner.configureNostrButton')}
						</a>
					{/if}

					<form
						method="post"
						action="{adminPrefix}?/telemetry"
						use:enhance={() => {
							currentView = 'declined';
							countdownSeconds = 30;
							countdownInterval = setInterval(updateCountdown, 1000);
							return async () => {};
						}}
					>
						<input type="hidden" name="choice" value="decline" />
						<button type="submit" class="btn bg-gray-600 text-white hover:bg-gray-500">
							{t('telemetry.banner.declineButton')}
						</button>
					</form>
				</div>
			{:else if currentView === 'accepted'}
				<div class="p-4 border-t border-gray-200 bg-green-50">
					<div class="flex items-start gap-4 ml-0 pl-0">
						<div class="flex-shrink-0 w-[75px] ml-0 pl-1 flex items-left justify-left">
							<span class="text-5xl leading-none ml-0 pl-0">✅</span>
						</div>
						<div class="flex-1 space-y-2 text-sm">
							<p class="font-semibold">{t('telemetry.banner.accepted.thankYou')}</p>
							<!-- eslint-disable-next-line svelte/no-at-html-tags -->
							<p>{@html t('telemetry.banner.accepted.message')}</p>
							<p class="text-gray-600">
								{t('telemetry.banner.accepted.autoHideCountdown', { seconds: countdownSeconds })}
							</p>
						</div>
					</div>
				</div>
			{:else if currentView === 'declined'}
				<div class="p-4 border-t border-gray-200 bg-yellow-50">
					<div class="flex items-start gap-4 ml-0 pl-0">
						<div class="flex-shrink-0 w-[75px] ml-0 pl-1 flex items-left justify-left">
							<span class="text-5xl leading-none ml-0 pl-0">🔒</span>
						</div>
						<div class="flex-1 space-y-2 text-sm">
							<p class="font-semibold">{t('telemetry.banner.declined.respect')}</p>
							<p>
								{t('telemetry.banner.declined.reaskCountdown', { seconds: countdownSeconds })}
							</p>
							<div>
								{t('telemetry.banner.declined.reask')}
								<form
									method="post"
									action="{adminPrefix}?/telemetry"
									use:enhance={() => {
										currentView = 'hidden';
										return async () => {};
									}}
									class="inline"
								>
									<input type="hidden" name="choice" value="hide" />
									<button type="submit" class="font-bold text-red-600 hover:text-red-800 underline">
										{t('telemetry.banner.declined.hideButton')}
									</button>
								</form>
							</div>
						</div>
					</div>
				</div>
			{/if}
		</div>
	{/if}
{/if}
