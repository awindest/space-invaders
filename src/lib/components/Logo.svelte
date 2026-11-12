<script lang="ts">
	import type { CanvasContext } from '$lib/types'
	import { getContext, onMount } from 'svelte'
	import logoSrc from '$images/SpaceInvadersLogoTrans.png'

	const canvasCtx = getContext<CanvasContext>('canvas')

	let logo: HTMLImageElement
	let loaded = $state(false)

	onMount(() => {
		logo = new Image()
		logo.onload = () => (loaded = true)
		logo.src = logoSrc
	})

	// Draws the logo onto the canvas. The starfield is drawn by GameCanvas
	// before this is called, so it shows through behind the logo.
	export function draw() {
		const ctx = canvasCtx.ctx
		const canvas = canvasCtx.canvas
		if (!ctx || !canvas || !loaded) return
		const cx = canvasCtx.width / 2
		const cy = canvasCtx.height / 3
		const w = Math.min(canvas.width * 0.5, logo.width)
		const h = w * (logo.height / logo.width)
		ctx.drawImage(logo, cx - w / 2, cy - h / 2, w, h)
	}
</script>
