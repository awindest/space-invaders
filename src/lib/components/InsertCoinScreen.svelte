<!-- src/lib/InsertCoinScreen.svelte -->
<script lang="ts">
	import Logo from '$components/Logo.svelte'
	import InsertCoinButton from '$components/InsertCoinButton.svelte'
	import { gameState } from '$stores/GameStore.svelte'

  let logo: Logo

  export function draw() {
    logo.draw()
  }
</script>

<!--
  Real DOM markup (the button), so this component must be rendered as a
  sibling of <canvas> in GameCanvas — not inside the canvas tags, since
  markup placed between <canvas> and </canvas> is fallback content and
  never actually shown on top of the canvas in supporting browsers.
-->
<div>
<Logo bind:this={logo}/>

{#if gameState.phase === 'insertCoin'}
	<InsertCoinButton />
{/if}
</div>
