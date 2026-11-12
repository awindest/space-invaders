<!-- src/lib/components/LevelScreen.svelte -->
<script lang="ts">
	import type { CanvasContext } from '$lib/types'
	import { getContext } from 'svelte'
	import { gameState } from '$stores/GameStore.svelte'

	const canvasCtx = getContext<CanvasContext>('canvas')

	// How long the announcement stays up before play resumes
	export const DURATION_MS = 2000
	const FADE_MS = 300 // fade in/out at the edges so it's not a hard cut

	export function draw(elapsedMs: number) {
		const ctx = canvasCtx.ctx
		const canvas = canvasCtx.canvas
		if (!ctx || !canvas) return

		let alpha = 1
		if (elapsedMs < FADE_MS) {
			alpha = elapsedMs / FADE_MS
		} else if (elapsedMs > DURATION_MS - FADE_MS) {
			alpha = Math.max(0, (DURATION_MS - elapsedMs) / FADE_MS)
		}

		ctx.save()
		ctx.globalAlpha = alpha
		ctx.fillStyle = '#ffffff'
		ctx.textAlign = 'center'
		ctx.textBaseline = 'middle'
		ctx.font = '20px beefd'
		ctx.fillText(`LEVEL ${gameState.level}`, canvasCtx.width / 2, canvasCtx.height / 2)
		ctx.restore()
	}
</script>
