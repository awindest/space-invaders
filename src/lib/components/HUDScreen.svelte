<!-- src/lib/HUDScreen.svelte -->
<script lang="ts">
	import { getContext, onMount } from 'svelte'
	import playerSpaceship from '$images/PlayerSpaceship.png'
	import { gameState } from '$stores/GameStore.svelte'

	let playerImage: HTMLImageElement
	let playerImageLoaded = $state(false)

	const canvasCtx = getContext<{
		canvas: HTMLCanvasElement | null
		ctx: CanvasRenderingContext2D | null
	}>('canvas')

	onMount(() => {
		playerImage = new Image()
		playerImage.onload = () => (playerImageLoaded = true)
		playerImage.src = playerSpaceship
	})

	function draw(score: number, highScore: number, level: number, lives: number): void {
		const ctx = canvasCtx.ctx
		if (!ctx) return
		ctx.save()

		const canvasWidth = canvasCtx.width
		const rightMargin = 36
		const usableWidth = canvasWidth - rightMargin
		const slotWidth = usableWidth / 4
		// centers of each of the 4 equal columns, spanning 0 → canvasWidth - 36
		const colX = [0, 1, 2, 3].map((i) => slotWidth * i + slotWidth / 2)

		ctx.textAlign = 'center' // const canvasHeight = canvasCtx.canvas?.height
		const y: number = 12 //distance from the top of the screen

		// HUD font
		ctx.font = '18px beefd'
		ctx.textBaseline = 'top'

		// SCORE
		ctx.fillStyle = '#F4FFBF'
		ctx.fillText('SCORE', colX[0], y)
		ctx.fillStyle = '#FFFFFF'
		ctx.fillText(String(score).padStart(6, '0'), colX[0], 34)

		// HI-SCORE
		ctx.fillStyle = '#F4FFBF'
		ctx.fillText('HI-SCORE', colX[1], y)
		ctx.fillStyle = '#FFFFFF'
		ctx.fillText(String(highScore).padStart(6, '0'), colX[1], 34)

		// LEVEL — top right just to the left of the mute button
		ctx.fillStyle = '#F4FFBF'
		ctx.fillText('LEVEL', colX[2], y)
		ctx.fillStyle = '#03FF07'
		ctx.fillText(String(level), colX[2], 34)

		// LIVES — , shown as small spaceship icons
		ctx.fillStyle = '#F4FFBF'
		ctx.fillText('LIVES', colX[3], y)

		if (playerImageLoaded === true && playerImage.naturalWidth > 0) {
			const iconScale = 0.06
			const iconW = playerImage.width * iconScale
			const iconH = playerImage.height * iconScale
			const totalIconsWidth = lives * iconW + (lives - 1) * 8
			const startX = colX[3] - totalIconsWidth / 2
			for (let i = 0; i < lives; i++) {
				ctx.drawImage(playerImage, startX + i * (iconW + 8), 34, iconW, iconH)
			}
		}

		// Draw a thin horizontal separator line under the HUD
		ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
		ctx.lineWidth = 1
		ctx.beginPath()
		ctx.moveTo(0, 56)
		ctx.lineTo(canvasWidth, 56)
		ctx.stroke()
		ctx.restore()
	}

	export function update() {
		draw(
			gameState.score,
			Math.max(gameState.highScore, gameState.score),
			gameState.level,
			gameState.lives
		)
	}
</script>
