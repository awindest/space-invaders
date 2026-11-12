<!-- src/lib/UFOSystem.svelte -->
<script lang="ts">
	import type { CanvasContext } from '$lib/types'
	import { getContext, onMount } from 'svelte'
	import spriteSheetSrc from '$images/InvadersSpriteSheetv6.png'
	import { audioStore } from '$stores/AudioStore.svelte'
	import { cSpaceship } from '$stores/config.svelte'
	import { gameState } from '$stores/GameStore.svelte'
	type ScorePopup = { x: number; y: number; text: string; life: number; maxLife: number }

	const POPUP_DURATION_MS = 700
	const POPUP_RISE_PX = 30

	let popups: ScorePopup[] = []

	const canvasCtx = getContext<CanvasContext>('canvas')

	// How close to the top the UFO flies — classic mystery-ship band, above
	// the invader formation's TOP_MARGIN in InvaderSystem.
	const UFO_Y = 62

	// Random spawn gap, in ms, between UFO appearances
	const MIN_SPAWN_DELAY_MS = 12000
	const MAX_SPAWN_DELAY_MS = 25000

	// Horizontal speed range in px/sec — cSpaceship.speed is a per-sheet
	// multiplier, so scale a base px/sec by it and randomize a bit per trip
	const BASE_SPEED = 100 //60
	const SPEED_VARIANCE = 20 // +/- randomization applied on each spawn

	const FRAME_INTERVAL_MS = 120 // sprite-sheet frame animation speed

	type Ufo = {
		x: number
		y: number
		direction: 1 | -1 // 1 = moving right, -1 = moving left
		speed: number
		frame: number
		frameTimer: number
	}

	let ufo: Ufo | null = null
	let spawnTimer = 0

	let spriteSheet: HTMLImageElement
	let spriteSheetLoaded = $state(false)

	function randomSpawnDelay() {
		return MIN_SPAWN_DELAY_MS + Math.random() * (MAX_SPAWN_DELAY_MS - MIN_SPAWN_DELAY_MS)
	}

	onMount(() => {
		spriteSheet = new Image()
		spriteSheet.onload = () => (spriteSheetLoaded = true)
		spriteSheet.src = spriteSheetSrc
		spawnTimer = randomSpawnDelay()
	})

	export function reset(width: number) {
		ufo = null
		popups = []
		audioStore.stop('spaceship-woo-woo')
		spawnTimer = randomSpawnDelay()
	}

	function spawn(canvasWidth: number) {
		// Randomly enter from either side
		const direction: 1 | -1 = Math.random() < 0.5 ? 1 : -1
		const startX = direction === 1 ? -cSpaceship.width : canvasWidth
		const speed = (BASE_SPEED + (Math.random() * 2 - 1) * SPEED_VARIANCE) * cSpaceship.speed

		ufo = {
			x: startX,
			y: UFO_Y,
			direction,
			speed,
			frame: 0,
			frameTimer: 0
		}

		// Assuming AudioStore supports a loop option for sustained sfx like
		// this, same pool-based pattern as the other looping sounds —
		// adjust the call shape to match your AudioStore API if it differs.
		audioStore.play('spaceship-woo-woo')
	}

	function despawn() {
		ufo = null
		audioStore.stop('spaceship-woo-woo')
	}

	// Classic mystery-ship score table, keyed by (shotsFired % 15) at the
	// moment of the kill — 0-indexed here so index 0 = the 1st shot in the
	// cycle. This is the well-known pattern from the original ROM.
	const UFO_SCORE_TABLE = [50, 50, 50, 100, 150, 100, 100, 50, 300, 100, 100, 100, 50, 150, 50]

	function scoreForShotCount(shotsFired: number): number {
		const index = shotsFired > 0 ? (shotsFired - 1) % UFO_SCORE_TABLE.length : 0
		return UFO_SCORE_TABLE[index]
	}
	export function update(dt: number) {
		// const canvas = canvasCtx.canvas
		if (!canvasCtx.canvas) return
		// Age popups first — they have to keep animating after the UFO is gone
		for (const p of popups) p.life += dt
		popups = popups.filter((p) => p.life < p.maxLife)

		if (!ufo) {
			spawnTimer -= dt
			if (spawnTimer <= 0) {
				spawn(canvasCtx.width)
			}
			return
		}

		ufo.x += ufo.direction * ufo.speed * (dt / 1000)

		ufo.frameTimer += dt
		if (ufo.frameTimer >= FRAME_INTERVAL_MS) {
			ufo.frameTimer = 0
			ufo.frame = (ufo.frame + 1) % (cSpaceship.maxFrame + 1)
		}

		// Off the far edge -> despawn and queue the next appearance
		const offLeft = ufo.direction === -1 && ufo.x < -cSpaceship.width
		const offRight = ufo.direction === 1 && ufo.x > canvasCtx.width
		if (offLeft || offRight) {
			despawn()
			spawnTimer = randomSpawnDelay()
		}
	}

	export function draw() {
		const ctx = canvasCtx.ctx
		if (!ctx || !spriteSheetLoaded) return
		if (ufo) {
			const sx = cSpaceship.spritePositionX + ufo.frame * cSpaceship.width
			const sy = cSpaceship.spritePositionY
			ctx.save()
			ctx.imageSmoothingEnabled = false
			ctx.drawImage(
				spriteSheet,
				sx,
				sy,
				cSpaceship.width,
				cSpaceship.height,
				ufo.x,
				ufo.y,
				cSpaceship.width,
				cSpaceship.height
			)
			ctx.restore()
		}

		// Popups are drawn whether or not a UFO is currently flying
		ctx.textAlign = 'center'
		ctx.font = '14px "beefd", monospace'
		for (const p of popups) {
			const t = p.life / p.maxLife
			const y = p.y - t * POPUP_RISE_PX
			ctx.save()
			ctx.globalAlpha = 1 - t
			ctx.fillStyle = '#f4ffbf'
			ctx.fillText(p.text, p.x, y)
			ctx.restore()
		}
	}

	export function getUfoRects(): { x: number; y: number; w: number; h: number; ref: Ufo }[] {
		if (!ufo) return []
		return [{ x: ufo.x, y: ufo.y, w: cSpaceship.width, h: cSpaceship.height, ref: ufo }]
	}
	export function destroyUfo() {
		if (!ufo) return
		const points = scoreForShotCount(gameState.shotsFired)
		gameState.score += points

		if (spriteSheetLoaded) {
			const { particles } = canvasCtx
			particles.shatter(
				spriteSheet,
				cSpaceship.spritePositionX + ufo.frame * cSpaceship.width,
				cSpaceship.spritePositionY,
				cSpaceship.width,
				cSpaceship.height,
				ufo.x,
				ufo.y,
				cSpaceship.width,
				cSpaceship.height,
				{ step: 4, speed: 200, life: 900, gravity: 120 }
			)
			particles.burst(ufo.x + cSpaceship.width / 2, ufo.y + cSpaceship.height / 2, {
				count: 20,
				colors: ['#ff0000', '#ffffff', '#ffcc00'],
				speed: 240,
				life: 500
			})
		}
		// Hook a score popup here the same way InvaderSystem does, if you want
		// the "+300" text floating up — pass `points` and ufo.x/ufo.y in.
		popups.push({
			x: ufo.x + cSpaceship.width / 2,
			y: ufo.y,
			text: `+${points}`,
			life: 0,
			maxLife: POPUP_DURATION_MS
		})
		despawn()
		spawnTimer = randomSpawnDelay()
	}
</script>

<!-- no markup — this component only exposes update(dt)/draw()/reset()/getUfoRect()/destroyUfo() -->
