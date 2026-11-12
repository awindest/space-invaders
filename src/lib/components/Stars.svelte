<!-- src/lib/StarField.svelte -->
<!--
What makes it feel good

Parallax via speed tiers — stars are assigned a random speed between 10 and 60 px/sec. Since size scales with speed, slow stars are tiny and dim (far away), fast stars are larger and brighter (close). No layering logic needed — it emerges from the distribution.

Twinkle via sine — each star has a random phase offset and rate into a shared elapsed timer. globalAlpha pulses between 0.6× and 1.0× of the star's base opacity. It avoids $state entirely — elapsed is a plain let.

Recycling — stars that drift past the bottom edge are reset to just above the top with a fresh random X, so the count stays constant with zero allocation per frame after init.

Color temperature — slow/distant stars skew blue-white (
#88aaff), mid stars are pure white, fast/close stars are slightly warm (
#fffacc). Subtle but it reads as depth. -->

<script lang="ts">
	// --- Types ---
	import type { CanvasContext } from '$lib/types'
	type Star = {
		x: number
		y: number
		speed: number // px/sec
		size: number // radius
		opacity: number
		twinklePhase: number // offset into sine wave
		twinkleSpeed: number
	}
	import { getContext, onMount } from 'svelte'

	// --- Constants ---
	const STAR_COUNT = 1000 // fills the screen nicely
	const SPEED_MIN = 10 // slowest layer
	const SPEED_MAX = 60 // fastest layer — parallax feel

	// --- State (plain JS) ---
	let stars: Star[] = []
	let canvasWidth = 800
	let canvasHeight = 600
	let elapsed = 0 // total ms — drives twinkle sine

	// Keep the context object itself — canvas/ctx are getters on it that
	// stay live as GameCanvas updates them. Destructuring them here would
	// snapshot their values at setup time (before GameCanvas's onMount has
	// even assigned ctx), freezing ctx as null forever.
	const canvasCtx = getContext<CanvasContext>('canvas')

	onMount(() => {
		canvasWidth = canvasCtx.width
		canvasHeight = canvasCtx.height
		init()
	})
	// --- Public API ---

	export function init() {
		// const canvas = canvasCtx.canvas
		// if (canvas) {
		// 	canvasWidth = canvas.width
		// 	canvasHeight = canvas.height
		// }
		stars = Array.from({ length: STAR_COUNT }, () => makeStar(true))
	}

	// --- Update star field ---

	export function update(dt: number) {
		elapsed += dt
		for (const star of stars) {
			star.y += star.speed * (dt / 1000)
			if (star.y > canvasHeight + star.size) {
				// Recycle off the top
				Object.assign(star, makeStar(false))
			}
		}
	}

	// --- Render star field ---

	export function draw() {
		const ctx = canvasCtx.ctx
		if (!ctx) return
		for (const star of stars) {
			const twinkle = 0.6 + 0.4 * Math.sin((elapsed / 1000) * star.twinkleSpeed + star.twinklePhase)
			const alpha = star.opacity * twinkle

			ctx.save()
			ctx.globalAlpha = alpha
			ctx.fillStyle = colorForSpeed(star.speed)
			ctx.beginPath()
			ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2)
			ctx.fill()
			ctx.restore()
		}
	}

	export function reset(width: number, height: number) {
		canvasWidth = width
		canvasHeight = height
		init()
	}

	// --- Internal ---

	function makeStar(randomY: boolean): Star {
		const speed = SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN)
		return {
			x: Math.random() * canvasWidth,
			y: randomY ? Math.random() * canvasHeight : -4,
			speed,
			size: speedToSize(speed),
			opacity: 0.4 + Math.random() * 0.6,
			twinklePhase: Math.random() * Math.PI * 2,
			twinkleSpeed: 0.5 + Math.random() * 2.5
		}
	}

	// Faster stars are bigger — reinforces parallax depth
	function speedToSize(speed: number): number {
		const t = (speed - SPEED_MIN) / (SPEED_MAX - SPEED_MIN)
		return 0.4 + t * 1.6 // 0.4px → 2px
	}

	// Slow stars are cool/blue (distant), fast stars are warm/white (close)
	function colorForSpeed(speed: number): string {
		const t = (speed - SPEED_MIN) / (SPEED_MAX - SPEED_MIN)
		if (t < 0.33) return '#88aaff' // distant — blue-white
		if (t < 0.66) return '#ffffff' // mid — white
		return '#fffacc' // close — warm white
	}
</script>

<!-- no markup -->
