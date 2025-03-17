<script lang="ts">
</script>

<div class="flex flex-row gap-4">
	<!--{#if pictures.length > 1}
		<div class="grow-[1] flex-col hidden sm:inline">
			<div class="flex flex-col items-start">
				{#each pictures.slice(0, 3) as picture, i}
					<button type="button" on:click={() => (pictureId = i)}>
						<PictureComponent
							{picture}
							class="w-[88px] h-[88px] border-gray-300 border rounded object-cover mb-2 {pictureId ===
							i
								? 'ring-2 ring-link ring-offset-2'
								: ''} "
						/>
					</button>
				{/each}
			</div>
		</div>
	{/if}
-->
	<div class="flex flex-row max-w-3xl tagWidget tagWidget-main pl-5">
		<div class="grow">
			<a href="google.fr"> EVENT Picture </a>
		</div>
		<div class="p-4 grow-[2] w-2/3">
			<a href="https://www.google.com/">
				<h2 class="text-2xl font-bold body-title mb-2">Soutien global au développement de beBOP</h2>
			</a>
			<p class="text-sm text-gray-600">Mercredi 19 mars 2025 - dès 15h</p>

			<p class="font-semibold text-sm mt-2">This is a short description of a test event.</p>

			<p class="text-sm text-gray-700 mt-2">
				This is a long description so I have to put words around here.
			</p>
			<p class="text-sm text-gray-700 mt-1">
				This is a long description so I have to put words around here.
			</p>
			<a
				href="https://www.google.com/"
				class="btn cartPreview-secondaryCTA text-xl text-center w-full md:w-[150px] p-1 mt-2"
			>
				More Info
			</a>
		</div>
	</div>
</div>
