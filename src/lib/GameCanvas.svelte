<!-- src/lib/GameCanvas.svelte -->
<script lang="ts">
	import { setContext, onMount } from 'svelte'
	import type { CanvasContext } from '$lib/types'
	// Game audio
	import { Howler } from 'howler'
	import { audioStore } from '$stores/AudioStore.svelte'

	import { gameState, resetGame, commitHighScore } from '$stores/GameStore.svelte'
	import { ParticleSystem } from './ParticleSystem'

	import PlayerSystem from './PlayerSystem.svelte'
	import InvaderSystem from './InvaderSystem.svelte'
	import HUDScreen from '$components/HUDScreen.svelte'
	import Stars from '$components/Stars.svelte'
	import InsertCoinScreen from '$components/InsertCoinScreen.svelte'
	import MenuScreen from '$components/MenuScreen.svelte'
	import MuteButton from '$components/MuteButton.svelte'
	import {
		checkFireballCollisions,
		checkMissileCollisions,
		checkFireballVsUfo
	} from './CollisionSystem'
	import UFOSystem from '$components/UFOSystem.svelte'
	import LevelScreen from '$components/LevelScreen.svelte'
	import { cLevels } from '$stores/config.svelte'

	let canvas = $state<HTMLCanvasElement | null>(null)
	let ctx = $state<CanvasRenderingContext2D | null>(null)
	let canvasWidth = $state(typeof window !== 'undefined' ? window.innerWidth : 800)
	let canvasHeight = $state(typeof window !== 'undefined' ? window.innerHeight : 600)

	let endStartTime = 0
	let endElapsed = 0
	const END_LOCKOUT_MS = 1000 // so a held Space can't instantly restart

	// Systems are plain objects, not reactive
	let stars: Stars
	let insertCoinScreen: InsertCoinScreen
	let menuScreen: MenuScreen
	let hud: HUDScreen
	let levelScreen: LevelScreen

	let levelIntroStartTime = 0
	let levelIntroElapsed = 0

	let player: PlayerSystem
	let invaders: InvaderSystem
	let ufo: UFOSystem

	const particles = new ParticleSystem()

	setContext<CanvasContext>('canvas', {
		get canvas() {
			return canvas
		},
		get ctx() {
			return ctx
		},
		get width() {
			return canvasWidth
		},
		get height() {
			return canvasHeight
		},
		particles
	})
	// Declared BEFORE the $effects so init runs first.
	onMount(() => {
		audioStore.init()
		return () => audioStore.dispose()
	})
	// Mute and background music both track continuous state (whether the
	// player muted, which phase we're in) rather than one-off events, so
	// they're the one part of audio wired reactively — see
	// AudioStore.svelte.ts for why the SFX calls elsewhere aren't.
	$effect(() => {
		Howler.mute(gameState.muted) // guards against gameState.muted ever being set outside toggleMute()
	})

	$effect(() => {
		if (gameState.phase === 'win') {
			audioStore.stop('background-music')
		} else {
			audioStore.play('background-music')
		}
	})

	let rafId: number
	let lastTime = 0
	let started = false
	let prevPhase = gameState.phase
	let menuStartTime = 0
	let menuElapsed = 0
	const MAX_DT_MS = 50 // a hidden tab pauses rAF; don't let the first frame back be seconds long

	function loop(timestamp: number) {
		try {
			if (!started) {
				lastTime = timestamp
				started = true
			}
			// Logic behind clamping dt - Switch tabs and come back, and dt can be several seconds.
			// Invaders jump, missiles skip past the player, and the bounce of the grid triggers.
			const dt = Math.min(timestamp - lastTime, MAX_DT_MS)
			lastTime = timestamp

			// Edge-detect entering the menu phase (can now be triggered from a
			// click on the Insert Coin button, not just an internal timer) so we
			// know when to start timing its score-reveal sequence.
			if (gameState.phase !== prevPhase) {
				if (gameState.phase === 'menu') {
					menuStartTime = timestamp
					menuElapsed = 0
				}
				if (gameState.phase === 'levelIntro') {
					levelIntroStartTime = timestamp
					levelIntroElapsed = 0
				}
				if (gameState.phase === 'gameover' || gameState.phase === 'win') {
					endStartTime = timestamp
					endElapsed = 0
					commitHighScore()
					audioStore.stop('spaceship-woo-woo')
					audioStore.play(gameState.phase === 'gameover' ? 'game-over' : 'bonus-score')
				}

				prevPhase = gameState.phase
			}

			if (gameState.phase === 'insertCoin') {
				stars.update(dt) // starfield keeps animating behind the screen
			} else if (gameState.phase === 'menu') {
				stars.update(dt)
				menuElapsed = timestamp - menuStartTime
			} else if (gameState.phase === 'levelIntro') {
				stars.update(dt)
				levelIntroElapsed = timestamp - levelIntroStartTime
				if (levelIntroElapsed >= levelScreen.DURATION_MS) {
					gameState.phase = 'playing'
				}
			} else if (gameState.phase === 'playing') {
				update(dt)
			} else if (gameState.phase === 'gameover' || gameState.phase === 'win') {
				stars.update(dt)
				endElapsed = timestamp - endStartTime
			}
			particles.update(dt)

			render(timestamp)
		} finally {
			rafId = requestAnimationFrame(loop)
		}
	}

	function update(dt: number) {
		stars.update(dt)
		player.update(dt)
		invaders.update(dt)
		ufo.update(dt)

		// collision checking
		checkFireballCollisions(player, invaders)
		checkMissileCollisions(invaders, player)
		checkFireballVsUfo(player, ufo)

		if (gameState.phase !== 'playing') return // a hit this frame may have ended the game

		if (invaders.getBottomY() >= player.getTopY()) {
			gameState.lives = 0
			gameState.phase = 'gameover'
			return
		}

		if (invaders.getInvaderRects().length === 0) {
			// did we kill 'em all? Then next level.
			if (gameState.level >= cLevels.length) {
				gameState.phase = 'win'
			} else {
				gameState.level += 1
				invaders.reset(canvasWidth)
				ufo.reset(canvasWidth)
				player.clearShots() // no frozen fireballs during the intro
				audioStore.play('start') // reuse the existing "get ready" cue — swap for a dedicated level-up sfx if you add one
				gameState.phase = 'levelIntro'
			}
		}
	}

	function render(timestamp: number) {
		const c = ctx!
		// c.clearRect(0, 0, canvas!.width, canvas!.height)
		c.clearRect(0, 0, canvasWidth, canvasHeight)
		stars.draw() // always behind everything else, in every phase

		if (gameState.phase === 'insertCoin') {
			insertCoinScreen.draw()
			return
		}
		if (gameState.phase === 'menu') {
			menuScreen.draw(timestamp - menuStartTime)
			return
		}
		if (gameState.phase === 'levelIntro') {
			invaders.draw()
			player.draw()
			ufo.draw()
			hud.update()
			particles.draw(c)
			levelScreen.draw(levelIntroElapsed)
			return
		}
		if (gameState.phase === 'gameover' || gameState.phase === 'win') {
			invaders.draw()
			particles.draw(c)
			hud.update()
			player.draw()
			drawEndScreen(c, timestamp)
			return
		}
		if (gameState.phase === 'playing') {
			invaders.draw()
			player.draw()
			hud.update()
			particles.draw(c)
			ufo.draw()
		}
	}

	function drawEndScreen(c: CanvasRenderingContext2D, timestamp: number) {
		const won = gameState.phase === 'win'
		c.save()
		c.textAlign = 'center'
		c.textBaseline = 'middle'
		c.fillStyle = won ? '#03FF07' : '#ff0000'
		c.font = '36px beefd'
		c.fillText(won ? 'YOU WIN' : 'GAME OVER', canvasWidth / 2, canvasHeight / 2 - 40)
		c.fillStyle = '#ffffff'
		c.font = '18px beefd'
		c.fillText(
			`SCORE ${String(gameState.score).padStart(6, '0')}`,
			canvasWidth / 2,
			canvasHeight / 2 + 10
		)
		if (endElapsed >= END_LOCKOUT_MS && Math.floor(timestamp / 500) % 2 === 0) {
			c.fillStyle = '#ff0000'
			c.fillText('PRESS SPACE TO PLAY AGAIN', canvasWidth / 2, canvasHeight / 2 + 60)
		}
		c.restore()
	}

	function restart() {
		resetGame() // level = 1 must be set before invaders.reset()
		invaders.reset(canvasWidth)
		ufo.reset(canvasWidth)
		player.reset()
		player.place()
		particles.clear()

		player.armForPlaying()
		audioStore.play('start')
		gameState.phase = 'levelIntro'
	}

	function handleKeydown(e: KeyboardEvent) {
		if (
			e.code === 'Space' &&
			gameState.phase === 'menu' &&
			menuElapsed >= menuScreen.SHIP_REVEAL_MS
		) {
			e.preventDefault()
			audioStore.play('start')
			player.armForPlaying()
			player.place()
			// gameState.phase = 'playing'
			gameState.phase = 'levelIntro'
		}
		if (
			e.code === 'Space' &&
			(gameState.phase === 'gameover' || gameState.phase === 'win') &&
			endElapsed >= END_LOCKOUT_MS
		) {
			e.preventDefault()
			restart()
		}
	}
	const MAX_DPR = 2 // 3x+ screens gain little and cost fill rate
	let dpr = 1

	// Sets the bitmap size, the CSS size and the transform in one place.
	// Assigning canvas.width/height wipes the bitmap AND resets all context
	// state (including the transform), so setTransform must come after them.
	function applyCanvasSize() {
		if (!canvas || !ctx) return
		dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
		canvasWidth = window.innerWidth
		canvasHeight = window.innerHeight
		canvas.width = Math.round(canvasWidth * dpr)
		canvas.height = Math.round(canvasHeight * dpr)
		canvas.style.width = `${canvasWidth}px`
		canvas.style.height = `${canvasHeight}px`
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
	}

	// Dragging the window between a Retina and a non-Retina monitor changes
	// devicePixelRatio without firing `resize`. Browser zoom does fire `resize`.
	let dprQuery: MediaQueryList | null = null
	function onDprChange() {
		handleResize()
		watchDpr()
	}
	function watchDpr() {
		dprQuery?.removeEventListener('change', onDprChange)
		dprQuery = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
		dprQuery.addEventListener('change', onDprChange)
	}
	function handleResize() {
		applyCanvasSize()
		// Canvas width/height attribute changes clear the drawing buffer,
		// and the star positions were generated for the old dimensions —
		// reset() regenerates them so they cover the new canvas instead of
		// being left clustered in the old (now wrong-sized) area.
		stars.reset(canvasWidth, canvasHeight)
		invaders.resize(canvasWidth)
		// ufo.reset(canvasWidth)
	}

	onMount(() => {
		canvasWidth = window.innerWidth
		canvasHeight = window.innerHeight
		ctx = canvas!.getContext('2d')
		applyCanvasSize() // replaces the manual width/height lines

		// Starfield's own onMount already ran (children mount before their
		// parent) and initialized itself using the stale default size, since
		// canvasWidth/canvasHeight weren't corrected yet at that point.
		// Explicitly reset it now that we know the real dimensions.
		stars.reset(canvasWidth, canvasHeight)
		invaders.reset(canvasWidth)
		// should have player.reset() & hud.reset() Now we do.

		watchDpr()
		rafId = requestAnimationFrame(loop)
		return () => {
			cancelAnimationFrame(rafId)
			dprQuery?.removeEventListener('change', onDprChange)
		}
	})
</script>

<svelte:window onresize={handleResize} onkeydown={handleKeydown} />

<div class="relative">
	<canvas bind:this={canvas} class="block bg-black">
		<Stars bind:this={stars} />
		<MenuScreen bind:this={menuScreen} />
		<InvaderSystem bind:this={invaders} />
		<PlayerSystem bind:this={player} />
		<UFOSystem bind:this={ufo} />
		<LevelScreen bind:this={levelScreen} />
		<HUDScreen bind:this={hud} />
	</canvas>
	<InsertCoinScreen bind:this={insertCoinScreen} />
	<MuteButton />
</div>
