<!-- src/lib/MenuScreen.svelte -->
<script lang="ts">
	import { getContext, onMount } from 'svelte'
	import type { CanvasContext } from '$lib/types'

	import spriteSheetSrc from '$images/InvadersSpriteSheetv6.png'
	import Logo from '$components/Logo.svelte'
	import { INVADER_TYPES, invaderFrameRect } from '$lib/invaderSprites'
	import { cSpaceship } from '$stores/config.svelte'

	const canvasCtx = getContext<CanvasContext>('canvas')

	type IconRow = {
		x: number
		y: number
		w: number
		h: number
		ax: number
		ay: number
		label: string
	}
	// (ax, ay) = centre of the VISIBLE pixels inside the source rect
	const ROWS: IconRow[] = [
		{
			...invaderFrameRect('squid', 0),
			ax: 24,
			ay: 16,
			label: `= ${INVADER_TYPES.squid.points} PTS`
		},
		{ ...invaderFrameRect('crab', 0), ax: 24, ay: 16, label: `= ${INVADER_TYPES.crab.points} PTS` },
		{
			...invaderFrameRect('octopus', 0),
			ax: 24,
			ay: 17,
			label: `= ${INVADER_TYPES.octopus.points} PTS`
		}
	]
	const SHIP: IconRow = {
		x: cSpaceship.spritePositionX,
		y: cSpaceship.spritePositionY,
		w: cSpaceship.width,
		h: cSpaceship.height,
		ax: 32,
		ay: 14,
		label: '= ??? PTS'
	}

	const SPRITE_SCALE = 1.5 // x DPR 2 = exactly 3 device px per sprite px
	const REVEAL_INTERVAL_MS = 1000
	const ROW_HEIGHT = 64
	const ICON_COL_W = cSpaceship.width * SPRITE_SCALE // the widest icon sets the column
	const ICON_TEXT_GAP = 20

	export const SHIP_REVEAL_MS = (ROWS.length + 1) * REVEAL_INTERVAL_MS

	// Coordinates measured directly from the 256x256 sprite sheet (frame 1 of each type)
	const SPRITES = {
		green: { x: 7, y: 0, w: 34, h: 32, points: '30' },
		cyan: { x: 1, y: 39, w: 46, h: 33, points: '20' },
		magenta: { x: 5, y: 75, w: 38, h: 33, points: '10' },
		ship: { x: 0, y: 105, w: 64, h: 34 }
	}

	// Mystery ship + prompt appear together, once all score rows have shown.
	// GameCanvas reads this to know when the reveal sequence has finished
	// (e.g. to gate dismissal and show the Insert Coin button).

	let logo: Logo
	let spriteSheet: HTMLImageElement
	let spriteSheetLoaded = $state(false)

	onMount(() => {
		spriteSheet = new Image()
		spriteSheet.onload = () => (spriteSheetLoaded = true)
		spriteSheet.src = spriteSheetSrc
	})

	export function drawOld(elapsed: number) {
		const ctx = canvasCtx.ctx
		if (!ctx) return
		const cx = canvasCtx.width / 2
		const cy = canvasCtx.height / 2

		// const rowHeight = 64
		// const rowStartY = cy + 40
		logo.draw()

		if (spriteSheetLoaded) {
			REVEAL_ROWS.forEach((sprite, i) => {
				if (elapsed < (i + 1) * REVEAL_INTERVAL_MS) return
				const y = rowStartY + i * rowHeight
				const dw = sprite.w * SPRITE_SCALE
				const dh = sprite.h * SPRITE_SCALE
				ctx.drawImage(
					spriteSheet,
					sprite.x,
					sprite.y,
					sprite.w,
					sprite.h,
					cx - 90 - dw / 2,
					y - dh / 2,
					dw,
					dh
				)
				ctx.fillStyle = '#f4ffbf'
				ctx.font = '18px "beefd", monospace'
				ctx.textAlign = 'left'
				ctx.fillText(`= ${sprite.points} PTS`, cx - 40, y + 5)
			})
		}

		if (elapsed >= SHIP_REVEAL_MS) {
			const y = rowStartY + REVEAL_ROWS.length * rowHeight
			if (spriteSheetLoaded) {
				const dw = SPRITES.ship.w * SPRITE_SCALE
				const dh = SPRITES.ship.h * SPRITE_SCALE
				ctx.drawImage(
					spriteSheet,
					SPRITES.ship.x,
					SPRITES.ship.y,
					SPRITES.ship.w,
					SPRITES.ship.h,
					cx - 90 - dw / 2,
					y - dh / 2,
					dw,
					dh
				)
			}
			ctx.fillStyle = '#f4ffbf'
			ctx.font = '18px "beefd", monospace'
			ctx.textAlign = 'left'
			ctx.fillText('= ??? PTS', cx - 40, y + 8)

			// Blink every second, same cadence as the classic arcade screen
			const blinkOn = Math.floor((elapsed - SHIP_REVEAL_MS) / 1000) % 2 === 0
			if (blinkOn) {
				ctx.fillStyle = '#ff0000'
				ctx.font = '20px "Beefd", monospace'
				ctx.textAlign = 'center'
				// ctx.fillText('PRESS SPACE BAR TO START', cx, cy + 320)
				ctx.fillText('PRESS SPACE BAR TO START', cx, Math.min(cy + 320, canvasCtx.height - 40))
			}
		}
	}
	export function draw(elapsed: number) {
		const ctx = canvasCtx.ctx
		if (!ctx) return
		const cx = canvasCtx.width / 2
		const cy = canvasCtx.height / 2

		logo.draw()

		ctx.save()
		ctx.font = '18px "beefd", monospace'
		ctx.textAlign = 'left'
		ctx.textBaseline = 'middle'
		ctx.imageSmoothingEnabled = false

		// Centre the whole table (icon column + gap + widest label) on the screen
		const labelW = ctx.measureText(SHIP.label).width
		const blockLeft = cx - (ICON_COL_W + ICON_TEXT_GAP + labelW) / 2
		const iconCx = blockLeft + ICON_COL_W / 2
		const textX = blockLeft + ICON_COL_W + ICON_TEXT_GAP
		const rowStartY = cy + 40

		const drawRow = (r: IconRow, i: number) => {
			const y = rowStartY + i * ROW_HEIGHT
			if (spriteSheetLoaded) {
				ctx.drawImage(
					spriteSheet,
					r.x,
					r.y,
					r.w,
					r.h,
					iconCx - r.ax * SPRITE_SCALE,
					y - r.ay * SPRITE_SCALE,
					r.w * SPRITE_SCALE,
					r.h * SPRITE_SCALE
				)
			}
			ctx.fillStyle = '#f4ffbf'
			ctx.fillText(r.label, textX, y)
		}

		ROWS.forEach((r, i) => {
			if (elapsed >= (i + 1) * REVEAL_INTERVAL_MS) drawRow(r, i)
		})

		if (elapsed >= SHIP_REVEAL_MS) {
			drawRow(SHIP, ROWS.length)
			if (Math.floor((elapsed - SHIP_REVEAL_MS) / 1000) % 2 === 0) {
				ctx.fillStyle = '#ff0000'
				ctx.font = '20px "beefd", monospace'
				ctx.textAlign = 'center'
				ctx.fillText('PRESS SPACE BAR TO START', cx, Math.min(cy + 320, canvasCtx.height - 40))
			}
		}
		ctx.restore()
	}
</script>

<Logo bind:this={logo} />
