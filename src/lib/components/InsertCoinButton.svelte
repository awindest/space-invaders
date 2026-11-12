<script lang="ts">
	import coin from '$images/Quarter.png'
	import { gameState } from '$stores/GameStore.svelte'
	import { audioStore } from '$stores/AudioStore.svelte'

	function insertCoin() {
		gameState.phase = 'menu'
		audioStore.play('insert-coin')
	}
</script>

<!-- <div class="pointer-events-none absolute inset-0 flex items-center justify-center px-12 pt-32 pb-12"
> -->
<div
	class="pointer-events-none absolute top-20 left-0 flex h-full w-full items-center justify-center p-12"
>
	<button
		onclick={insertCoin}
		class="metal linear pointer-events-auto flex items-center justify-center gap-4 rounded-full bg-white px-6 py-3 text-2xl text-black"
	>
		Insert Coin
		<img
			src={coin}
			height="40"
			width="40"
			alt="a quarter"
			title="The lowly quarter: How long will it last?"
		/>
	</button>
</div>
