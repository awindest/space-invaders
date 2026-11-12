<script lang="ts">
	import './layout.css'
	import favicon from '$lib/assets/invader-green-black-eyes.png'

	let { children } = $props()
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}
