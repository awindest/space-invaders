<!-- src/lib/PlayerSystem.svelte -->
<script lang="ts">
	import type { CanvasContext } from '$lib/types'
	import { getContext, onMount } from 'svelte'
	import { SvelteSet } from 'svelte/reactivity'
	import playerSrc from '$images/PlayerSpaceship.png'
	import fireballSrc from '$images/Fireball.png'
	import { audioStore } from '$stores/AudioStore.svelte'
	import { gameState } from '$stores/GameStore.svelte'

	const canvasCtx = getContext<CanvasContext>('canvas')

	type ExhaustType = {
		x: number
		y: number
		vx: number
		vy: number
		life: number
		maxLife: number
		size: number
	}
	// Exhaust parameters
	const EXHAUST_INTERVAL_MS = 1000 / 60
	let exhaustAcc = 0

	type Fireball = { x: number; y: number; vy: number } // don't need a vx

	const SPEED = 320 // px/sec
	const SHOT_COOLDOWN_MS = 300
	const FIREBALL_SPEED = 480 // px/sec, moving up the screen
	const FIREBALL_DISPLAY_WIDTH = 14

	// Matches config.svelte.ts's cFireball: Fireball.png (20x145) is a
	// 4-frame vertical strip, not one static image — 145 / 4 = 36.25,
	// Frames are stacked at X=0, Y=frame*36.25.
	const FIREBALL_FRAME_W = 20
	const FIREBALL_FRAME_H = 36.25
	const FIREBALL_FRAME_COUNT = 4
	const FIREBALL_FRAME_INTERVAL_MS = 60 // fast flicker, like a burning flame

	let player: HTMLImageElement
	let playerLoaded = $state(false)
	let fireballImg: HTMLImageElement
	let fireballLoaded = $state(false)

	// Position is initialized lazily on the first update() call. update() is
	// only ever called while gameState.phase === 'playing', which is well
	// after GameCanvas's onMount has corrected the canvas size from its
	// SSR/prerender defaults — so there's no race with stale dimensions
	// like Starfield's original self-init bug had.
	let x: number | null = null
	let y = 0
	let playerWidth = 0
	let playerHeight = 0
	let rotation: number = 0 // rotate ship a little when moving from side to side

	let exhaust: ExhaustType[] = []
	let fireballs: Fireball[] = []
	let cooldown = 0

	// particles for explosion
	const RESPAWN_DELAY_MS = 1200 // ship stays gone while the explosion plays
	const RESPAWN_INVINCIBILITY_MS = 1500
	let respawnTimer = 0

	// All active fireballs flicker in sync off one shared frame counter —
	// simpler than tracking a frame per fireball, and looks the same since
	// they're all the same flame texture.
	let fireballFrame = 0
	let fireballFrameTimer = 0

	const keys = new SvelteSet<string>()

	// The spacebar press that starts the game (menu -> playing) is the same
	// physical keydown PlayerSystem sees here. Without this, that one press
	// both starts the game AND is read as "Space is held" on the very next
	// frame, firing an immediate free shot. GameCanvas calls armForPlaying()
	// at the moment it flips to 'playing'; if Space is still down then, we
	// require a release before the first shot is allowed.
	let ignoreSpaceUntilRelease = false

	export function armForPlaying() {
		// Always gate unconditionally — checking keys.has('Space') here was
		// a race: GameCanvas's svelte:window handler and this component's
		// own separate window listener are two independent listeners on
		// the same keydown event, and their firing order isn't guaranteed.
		// If this handler ran first, 'Space' wasn't in the Set yet even
		// though the key genuinely was being held, so the gate never got
		// set. We know for certain this function only runs in direct
		// response to that exact keypress, so there's nothing to check.
		ignoreSpaceUntilRelease = true
	}

	function onKeyDown(e: KeyboardEvent) {
		keys.add(e.code)
		if (e.code === 'Space') e.preventDefault() // don't scroll the page
	}

	function onKeyUp(e: KeyboardEvent) {
		keys.delete(e.code)
		if (e.code === 'Space') ignoreSpaceUntilRelease = false
	}

	function onBlur() {
		keys.clear()
		ignoreSpaceUntilRelease = false
	}

	export function place() {
		if (!playerLoaded) return
		y = canvasCtx.height - playerHeight - 24
		x = (canvasCtx.width - playerWidth) / 2
	}
	onMount(() => {
		player = new Image()
		player.src = playerSrc

		player.onload = () => {
			playerLoaded = true
			const scale = 0.15
			playerWidth = player.width * scale
			playerHeight = player.height * scale
		}

		fireballImg = new Image()
		fireballImg.onload = () => (fireballLoaded = true)
		fireballImg.src = fireballSrc

		window.addEventListener('keydown', onKeyDown)
		window.addEventListener('keyup', onKeyUp)
		window.addEventListener('blur', onBlur)

		return () => {
			window.removeEventListener('keydown', onKeyDown)
			window.removeEventListener('keyup', onKeyUp)
			window.removeEventListener('blur', onBlur)
		}
	})

	function spawnParticle() {
		if (x === null) return
		// Emitted from the rear/bottom of the ship — it faces up, so its
		// "exhaust" is the trailing edge, opposite the nose.
		exhaust.push({
			x: x + playerWidth / 2 + (Math.random() - 0.5) * 12, // 12 spreads them out
			y: y + playerHeight - 4,
			vx: (Math.random() - 0.5) * 20,
			vy: 60 + Math.random() * 60,
			life: 0,
			maxLife: 250 + Math.random() * 200,
			size: 1.5 + Math.random() * 2
		})
	}

	export function getFireballRects(): {
		x: number
		y: number
		w: number
		h: number
		ref: Fireball
	}[] {
		if (!fireballLoaded) return []
		const scale = FIREBALL_DISPLAY_WIDTH / FIREBALL_FRAME_W
		const h = FIREBALL_FRAME_H * scale
		return fireballs.map((f) => ({
			x: f.x - FIREBALL_DISPLAY_WIDTH / 2,
			y: f.y - h,
			w: FIREBALL_DISPLAY_WIDTH,
			h,
			ref: f
		}))
	}

	export function destroyFireball(fireball: Fireball) {
		fireballs = fireballs.filter((existing) => existing !== fireball)
	}

	// A stable reference representing "the player" for CollisionSystem's ref
	// pattern — there's only ever one, so this is just a sentinel object
	// rather than a real per-instance record like Fireball/Invader have.
	const playerRef = {}

	export function getPlayerRects(): { x: number; y: number; w: number; h: number; ref: unknown }[] {
		if (!playerLoaded || x === null || invincibleTimer > 0) return []
		return [
			{
				x,
				y,
				w: playerWidth,
				h: playerHeight,
				ref: playerRef
			}
		]
	}
	let invincibleTimer = 0

	function spawnExplosionUnUsed() {
		if (x === null) return
		const cx = x + playerWidth / 2
		const cy = y + playerHeight / 2
		for (let i = 0; i < EXPLOSION_PARTICLE_COUNT; i++) {
			const angle = Math.random() * Math.PI * 2
			const speed = 40 + Math.random() * 120
			particles.push({
				x: cx,
				y: cy,
				vx: Math.cos(angle) * speed,
				vy: Math.sin(angle) * speed,
				life: 0,
				maxLife: 300 + Math.random() * 300,
				size: 2 + Math.random() * 3
			})
		}
	}

	function spawnExplosion() {
		if (x === null) return
		const { particles } = canvasCtx
		particles.shatter(
			player,
			0,
			0,
			player.naturalWidth,
			player.naturalHeight,
			x,
			y,
			playerWidth,
			playerHeight,
			{
				step: 4,
				speed: 220,
				life: 1000,
				gravity: 80
			}
		)
		particles.burst(x + playerWidth / 2, y + playerHeight / 2, {
			count: 30,
			colors: ['#ffffff', '#ffcc66', '#ff6633'],
			speed: 260,
			life: 600
		})
	}
	export function destroyPlayer(_ref: unknown) {
		// ignore extra hits: already dead, game over, or in the respawn grace period
		if (gameState.phase !== 'playing' || x === null || invincibleTimer > 0) return

		spawnExplosion()
		gameState.lives -= 1
		fireballs = []
		exhaust = []
		x = null // hidden (and un-hittable) until respawnTimer runs out

		if (gameState.lives <= 0) {
			gameState.phase = 'gameover'
		} else {
			respawnTimer = RESPAWN_DELAY_MS
		}
	}
	export function update(dt: number) {
		// Wait for the sprite: playerWidth/Height are 0 until it loads
		if (!canvasCtx.canvas || !playerLoaded) return
		y = canvasCtx.height - playerHeight - 24 // leave 24px to see exhaust
		// Dead: wait out the explosion, then re-centre and start the grace period
		if (respawnTimer > 0) {
			respawnTimer -= dt
			if (respawnTimer > 0) return
			invincibleTimer = RESPAWN_INVINCIBILITY_MS // x is already null: re-centred just below
		}

		// update invicibleTimer
		invincibleTimer = Math.max(0, invincibleTimer - dt)

		// Recomputed each frame so window resizes work with no special handling
		if (x === null) x = (canvasCtx.width - playerWidth) / 2 // also used on respawn

		const dx = (keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0)
		// x is the ship's LEFT edge (same as draw(), getPlayerRects(), and the fireball spawn)
		x = Math.max(0, Math.min(canvasCtx.width - playerWidth, x + dx * SPEED * (dt / 1000)))

		// rotate spaceship if arrow keys are pressed
		if (keys.has('ArrowRight')) {
			rotation = 0.15 // radians
		} else if (keys.has('ArrowLeft')) {
			rotation = -0.15 // radians
		} else {
			rotation = 0
		}

		// Engine trail

		exhaustAcc += dt
		while (exhaustAcc >= EXHAUST_INTERVAL_MS) {
			spawnParticle()
			exhaustAcc -= EXHAUST_INTERVAL_MS
		}

		for (const particle of exhaust) {
			particle.life += dt
			particle.x += particle.vx * (dt / 1000)
			particle.y += particle.vy * (dt / 1000)
		}
		exhaust = exhaust.filter((particle) => particle.life < particle.maxLife)

		// Shooting
		cooldown = Math.max(0, cooldown - dt)
		if (keys.has('Space') && !ignoreSpaceUntilRelease && cooldown <= 0) {
			const fireballX: number = x + playerWidth / 2
			gameState.shotsFired += 1
			fireballs.push({ x: fireballX, y, vy: -FIREBALL_SPEED }) // spawns at the nose (top edge)
			cooldown = SHOT_COOLDOWN_MS
			audioStore.play('player-missile')
		}
		for (const fireball of fireballs) {
			fireball.y += fireball.vy * (dt / 1000)
		}
		fireballs = fireballs.filter((f) => f.y > -60)

		// Flame flicker animation, shared across all active fireballs
		fireballFrameTimer += dt
		if (fireballFrameTimer >= FIREBALL_FRAME_INTERVAL_MS) {
			fireballFrameTimer = 0
			fireballFrame = (fireballFrame + 1) % FIREBALL_FRAME_COUNT
		}
	}

	export function draw() {
		const ctx = canvasCtx.ctx
		if (!ctx || x === null) return
		// || (invincibleTimer > 0 && Math.floor(invincibleTimer / 100) % 2)) return

		// exhaust behind the ship
		for (const p of exhaust) {
			const t = p.life / p.maxLife
			ctx.save()
			ctx.globalAlpha = 1 - t
			ctx.fillStyle = t < 0.5 ? '#ffcc66' : '#ff6633'
			ctx.beginPath()
			ctx.arc(p.x, p.y, p.size * (1 - t * 0.6), 0, Math.PI * 2)
			ctx.fill()
			ctx.restore()
		}
		// Only the ship blinks during the grace period; trail and fireballs stay solid
		const blinkOff = invincibleTimer > 0 && Math.floor(invincibleTimer / 100) % 2 === 1
		if (playerLoaded && !blinkOff) {
			// const scale = SHIP_DISPLAY_WIDTH / ship.width
			// const h = ship.height * scale
			ctx.save()
			// ctx.translate(x + SHIP_DISPLAY_WIDTH / 2, y + SHIP_DISPLAY_WIDTH / 2)
			ctx.translate(x + playerWidth / 2, y + playerHeight / 2)
			ctx.rotate(rotation)
			ctx.translate(-x - playerWidth / 2, -y - playerHeight / 2)

			// ctx.translate(-x - SHIP_DISPLAY_WIDTH / 2, -y - SHIP_DISPLAY_WIDTH / 2)
			ctx.drawImage(player, x, y, playerWidth, playerHeight)
			// ctx.drawImage(ship, x - SHIP_DISPLAY_WIDTH / 2, y, SHIP_DISPLAY_WIDTH, h)q
			ctx.restore()
		}

		if (fireballLoaded) {
			const scale = FIREBALL_DISPLAY_WIDTH / FIREBALL_FRAME_W
			const h = FIREBALL_FRAME_H * scale
			const sy = fireballFrame * FIREBALL_FRAME_H
			for (const fireball of fireballs) {
				ctx.drawImage(
					fireballImg,
					0,
					sy,
					FIREBALL_FRAME_W,
					FIREBALL_FRAME_H,
					fireball.x - FIREBALL_DISPLAY_WIDTH / 2,
					fireball.y - h,
					FIREBALL_DISPLAY_WIDTH,
					h
				)
			}
		}
	}
	export function reset() {
		x = null
		fireballs = []
		exhaust = []
		cooldown = 0
		invincibleTimer = 0
		respawnTimer = 0
		rotation = 0
	}
	export function clearShots() {
		fireballs = []
	}
	export function getTopY(): number {
		return playerLoaded ? y : Infinity
	}
</script>

<!-- no markup — this component only exposes update(dt)/draw(), called imperatively from GameCanvas -->
