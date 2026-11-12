<script lang="ts">
	import { audioStore } from '$stores/AudioStore.svelte'

	let muted: boolean = $derived(audioStore.muted) // rune'd reactive now!
	// decided against making the Mute Button invisible when playing.
	// It persists throughout all phases of the game.
</script>

<div class="absolute top-4 right-4">
	<button
		class="metal linear rounded-full p-2 [&>*]:h-7 [&>*]:w-7"
		onclick={() => audioStore.toggleMute()}
		aria-label={muted ? 'Unmute all audio' : 'Mute all audio'}
		title={muted ? 'Muted' : 'Unmuted'}
	>
		{#if muted === true}
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="192"
				height="192"
				fill="#000000"
				viewBox="0 0 256 256"
			>
				<rect width="256" height="256" fill="none" /><path
					d="M80,168H32a8,8,0,0,1-8-8V96a8,8,0,0,1,8-8H80l72-56V224Z"
					fill="none"
					stroke="#000000"
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="16"
				/>
				<line
					x1="240"
					y1="104"
					x2="192"
					y2="152"
					fill="none"
					stroke="#000000"
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="16"
				/>
				<line
					x1="240"
					y1="152"
					x2="192"
					y2="104"
					fill="none"
					stroke="#000000"
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="16"
				/>
			</svg>
		{:else}
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="192"
				height="192"
				fill="#000000"
				viewBox="0 0 256 256"
				><rect width="256" height="256" fill="none" /><path
					d="M80,168H32a8,8,0,0,1-8-8V96a8,8,0,0,1,8-8H80l72-56V224Z"
					fill="none"
					stroke="#000000"
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="16"
				/><line
					x1="192"
					y1="104"
					x2="192"
					y2="152"
					fill="none"
					stroke="#000000"
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="16"
				/><line
					x1="224"
					y1="88"
					x2="224"
					y2="168"
					fill="none"
					stroke="#000000"
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="16"
				/></svg
			>
		{/if}
	</button>
</div>
