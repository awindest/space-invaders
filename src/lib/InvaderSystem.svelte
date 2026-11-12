<!-- src/lib/InvaderSystem.svelte -->
<script lang="ts">
	import type { CanvasContext } from '$lib/types'
	import { getContext, onMount } from 'svelte'
	import { gameState } from '$stores/GameStore.svelte'
	import spriteSheetSrc from '$images/InvadersSpriteSheetv6.png'
	import { audioStore } from '$stores/AudioStore.svelte'
	import { cLevels, cInvaderMissile } from '$stores/config.svelte'

	import {
		CELL_W,
		CELL_H,
		INVADER_TYPES,
		invaderFrameRect,
		type InvaderTypeName
	} from './invaderSprites'
	import { SvelteMap } from 'svelte/reactivity'

	const canvasCtx = getContext<CanvasContext>('canvas')

	type Invader = {
		type: InvaderTypeName
		col: number
		row: number
		alive: boolean
		localX: number // position within the formation, before group offset
		localY: number
	}

	type Missile = { x: number; y: number; frame: number; frameTimer: number }

	const MISSILE_SHOOT_INTERVAL_MS = 900 // avg time between invader shots
	const MISSILE_FRAME_INTERVAL_MS = 100 // animation speed

	let missiles: Missile[] = []
	let shootTimer = MISSILE_SHOOT_INTERVAL_MS

	type ScorePopup = { x: number; y: number; text: string; life: number; maxLife: number }

	const POPUP_DURATION_MS = 700
	const POPUP_RISE_PX = 30

	let popups: ScorePopup[] = []

	// Matches config.svelte.ts's cInvaderGrid (5 rows x 11 columns — the
	// classic layout)
	const GRID_COLS = 11
	const GRID_ROWS = 5
	const CELL_DISPLAY = 48 //32 // on-screen size sprites are scaled to fit within
	const TOP_MARGIN = 100
	const EDGE_MARGIN = 24 // how close the formation can get to the canvas edges
	const STEP_DOWN = 18
	const BASE_SPEED = 20 // px/sec at full strength (11 cols is wider, so a bit slower)
	const MAX_SPEED = 130 // px/sec with only one invader left
	const FRAME_INTERVAL_MS = 500

	// cLevels' fireRate/missileSpeed are small abstract numbers (40-100,
	// 4-6), not real ms/px-per-sec — these two constants are my conversion
	// factors turning them into usable units. Tune to taste.
	const FIRE_RATE_MS_PER_UNIT = 10
	const MISSILE_SPEED_UNIT = 30

	// Maps a level's invaderPattern value (1/2/3, matching cInvaderScores'
	// point tiers) to the sprite type for that row
	const PATTERN_VALUE_TO_TYPE: Record<number, InvaderTypeName> = {
		1: 'squid',
		2: 'crab',
		3: 'octopus'
	}

	function currentLevelConfig() {
		const index = Math.min(gameState.level - 1, cLevels.length - 1)
		return cLevels[Math.max(0, index)]
	}

	// Gap between invaders in the formation, in px — added on top of CELL_W/
	// CELL_H (which are sprite-sheet cell sizes, not layout spacing).
	const H_SPACING = 14
	const V_SPACING = 14
	const STEP_X = CELL_W + H_SPACING
	const STEP_Y = CELL_H + V_SPACING
	const GRID_W = GRID_COLS * STEP_X - H_SPACING // real footprint: N cells + (N-1) gaps

	// Grid row -> sprite type, matching cInvaderScores exactly (row 0 = top
	// = most valuable, same as the classic game and MenuScreen's table)
	function typeForRow(row: number): InvaderTypeName {
		const value = currentLevelConfig().invaderPattern[row] ?? 3
		return PATTERN_VALUE_TO_TYPE[value] ?? 'octopus'
	}

	function getShooters(): Invader[] {
		// Only the bottom-most alive invader in each column can fire
		const byCol = new SvelteMap<number, Invader>()
		for (const inv of invaders) {
			if (!inv.alive) continue
			const current = byCol.get(inv.col)
			if (!current || inv.row > current.row) byCol.set(inv.col, inv)
		}
		return [...byCol.values()]
	}

	let invaders: Invader[] = []

	let originX = 0
	let originY = TOP_MARGIN
	let gridX = 0
	let gridY = 0
	let direction = 1 // 1 = right, -1 = left

	let frame: 0 | 1 = 0
	let frameTimer = 0

	let spriteSheet: HTMLImageElement
	let spriteSheetLoaded = $state(false)

	onMount(() => {
		spriteSheet = new Image()
		spriteSheet.onload = () => (spriteSheetLoaded = true)
		spriteSheet.src = spriteSheetSrc
	})

	function buildGrid(width: number) {
		// total footprint: N cells + (N-1) gaps, not N full strides

		// const gridWidth = GRID_COLS * STEP_X - H_SPACING
		originX = (width - GRID_W) / 2
		originY = TOP_MARGIN
		gridX = 0
		gridY = 0
		direction = 1

		missiles = []
		shootTimer = currentLevelConfig().fireRate * FIRE_RATE_MS_PER_UNIT

		invaders = []
		for (let row = 0; row < GRID_ROWS; row++) {
			for (let col = 0; col < GRID_COLS; col++) {
				invaders.push({
					type: typeForRow(row),
					col,
					row,
					alive: true,
					localX: col * STEP_X,
					localY: row * STEP_Y
				})
			}
		}
	}

	export function init() {
		buildGrid(canvas ? canvasCtx.width : 800)
	}

	// Called explicitly by GameCanvas once real dimensions are known, same
	// pattern as Starfield.reset() — avoids sizing itself off stale
	// defaults during its own onMount.
	export function reset(width: number) {
		buildGrid(width)
	}

	export function getInvaderRects(): {
		x: number
		y: number
		w: number
		h: number
		ref: Invader
	}[] {
		return invaders
			.filter((invader) => invader.alive)
			.map((invader) => ({
				x: originX + gridX + invader.localX,
				y: originY + gridY + invader.localY,
				w: CELL_W,
				h: CELL_H,
				ref: invader
			}))
	}

	export function destroyInvader(invader: Invader) {
		if (!invader.alive) return
		invader.alive = false
		const points = INVADER_TYPES[invader.type].points
		gameState.score += points
		const x = originX + gridX + invader.localX
		const y = originY + gridY + invader.localY

		if (spriteSheetLoaded) {
			const s = invaderFrameRect(invader.type, frame)
			canvasCtx.particles.shatter(spriteSheet, s.x, s.y, s.w, s.h, x, y, CELL_W, CELL_H, {
				step: 4,
				speed: 130,
				life: 600
			})
		}
		popups.push({
			x: x + CELL_W / 2,
			y: y + CELL_H / 2,
			text: `+${points}`,
			life: 0,
			maxLife: POPUP_DURATION_MS
		})
	}

	export function getMissileRects(): {
		x: number
		y: number
		w: number
		h: number
		ref: Missile
	}[] {
		return missiles.map((m) => ({
			x: m.x,
			y: m.y,
			w: cInvaderMissile.width,
			h: cInvaderMissile.height,
			ref: m
		}))
	}

	export function destroyMissile(missile: Missile) {
		missiles = missiles.filter((m) => m !== missile)
	}

	export function update(dt: number) {
		if (!canvasCtx.canvas) return

		const levelConfig = currentLevelConfig()

		// Popup scores
		for (const p of popups) {
			p.life += dt
		}
		popups = popups.filter((p) => p.life < p.maxLife)
		const alive = invaders.filter((invader) => invader.alive)
		if (alive.length > 0) {
			let minLocal = Infinity,
				maxLocal = -Infinity
			for (const i of alive) {
				minLocal = Math.min(minLocal, i.localX)
				maxLocal = Math.max(maxLocal, i.localX)
			}
			// Speed up as the formation thins out, classic-style, then scaled
			// again by the level's own speedMultiplier
			const strength = alive.length / invaders.length
			const speed =
				(BASE_SPEED + (MAX_SPEED - BASE_SPEED) * (1 - strength)) * levelConfig.speedMultiplier

			gridX += direction * speed * (dt / 1000)

			// Bounds are in gridX space, using the real formation width. Clamping
			// (instead of just flipping) means a big dt can't leave us past an edge.
			const minGridX = EDGE_MARGIN - originX - minLocal
			const maxGridX = canvasCtx.width - EDGE_MARGIN - CELL_W - originX - maxLocal
			if (maxGridX > minGridX) {
				// (if the window is too narrow to fit the formation, don't bounce at all)
				if (direction === 1 && gridX >= maxGridX) {
					gridX = maxGridX
					direction = -1
					gridY += STEP_DOWN
				} else if (direction === -1 && gridX <= minGridX) {
					gridX = minGridX
					direction = 1
					gridY += STEP_DOWN
				}
			}
			frameTimer += dt
			if (frameTimer >= FRAME_INTERVAL_MS) {
				frameTimer = 0
				frame = frame === 0 ? 1 : 0
				audioStore.play('invader-walk')
			}

			shootTimer -= dt
			if (shootTimer <= 0) {
				shootTimer = levelConfig.fireRate * FIRE_RATE_MS_PER_UNIT
				const shooters = getShooters()
				if (shooters.length > 0) {
					const shooter = shooters[Math.floor(Math.random() * shooters.length)]
					missiles.push({
						x: originX + gridX + shooter.localX + CELL_W / 2 - cInvaderMissile.width / 2,
						y: originY + gridY + shooter.localY + CELL_H,
						frame: 0,
						frameTimer: 0
					})
					audioStore.play('invader-shoot')
				}
			}
		}

		// Missiles keep falling/animating even the instant the formation
		// clears, so an already-in-flight shot still resolves
		const missileSpeedPxPerSec = levelConfig.missileSpeed * MISSILE_SPEED_UNIT
		for (const m of missiles) {
			m.y += missileSpeedPxPerSec * (dt / 1000)
			m.frameTimer += dt
			if (m.frameTimer >= MISSILE_FRAME_INTERVAL_MS) {
				m.frameTimer = 0
				m.frame = (m.frame + 1) % (cInvaderMissile.maxFrame + 1)
			}
		}
		missiles = missiles.filter((m) => m.y < canvasCtx.height)
	}

	export function draw() {
		const ctx = canvasCtx.ctx
		if (!ctx || !spriteSheetLoaded) return
		ctx.save()
		ctx.imageSmoothingEnabled = false
		for (const invader of invaders) {
			if (!invader.alive) continue
			const sprite = invaderFrameRect(invader.type, frame)
			// const scale = CELL_DISPLAY / Math.max(sprite.w, sprite.h)
			// const dw = sprite.w * scale
			// const dh = sprite.h * scale
			const x = originX + gridX + invader.localX
			const y = originY + gridY + invader.localY
			ctx.drawImage(spriteSheet, sprite.x, sprite.y, sprite.w, sprite.h, x, y, CELL_W, CELL_H)
		}
		for (const m of missiles) {
			const sx = cInvaderMissile.spritePositionX + m.frame * cInvaderMissile.width
			const sy = cInvaderMissile.spritePositionY
			ctx.drawImage(
				spriteSheet,
				sx,
				sy,
				cInvaderMissile.width,
				cInvaderMissile.height,
				m.x,
				m.y,
				cInvaderMissile.width,
				cInvaderMissile.height
			)
		}
		ctx.restore()

		ctx.textAlign = 'center'
		ctx.font = '14px "beefd", monospace'
		for (const p of popups) {
			const t = p.life / p.maxLife
			const y = originY + gridY + (p.y - originY - gridY) - t * POPUP_RISE_PX
			ctx.save()
			ctx.globalAlpha = 1 - t
			ctx.fillStyle = '#f4ffbf'
			ctx.fillText(p.text, p.x, y)
			ctx.restore()
		}
	}
	// Re-center on window resize without resurrecting dead invaders or
	// clearing missiles. gridX is an offset from originX, so progress is kept.
	export function resize(width: number) {
		originX = (width - GRID_W) / 2
	}
	export function getBottomY(): number {
		let max = -Infinity
		for (const inv of invaders) {
			if (inv.alive) max = Math.max(max, originY + gridY + inv.localY + CELL_H)
		}
		return max
	}
</script>

<!-- no markup — this component only exposes update(dt)/draw()/reset()/collision helpers -->
