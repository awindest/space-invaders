// Plain class (no Svelte). GameCanvas owns one instance and shares it via context.
// The offscreen canvas is created lazily so prerender/SSR is safe.

type Particle = {
	x: number; y: number
	vx: number; vy: number
	g: number            // gravity, px/s²
	life: number; maxLife: number
	size: number
	color: string
}
type Pixel = { ox: number; oy: number; color: string }

export interface ShatterOptions {
	step?: number     // chunk size in px (default 3)
	speed?: number    // base outward speed px/s (default 140)
	life?: number     // base lifetime ms (default 700)
	gravity?: number  // px/s² (default 0)
	tint?: string     // override the sprite's own colours
}
export interface BurstOptions {
	count?: number
	colors?: string[]
	speed?: number
	life?: number
	size?: number
	gravity?: number
}

const MAX_PARTICLES = 1500

export class ParticleSystem {
	private particles: Particle[] = []
	private cache = new Map<string, Pixel[]>()
	private scratch: HTMLCanvasElement | null = null

	/** Break a sprite into chunks that fly outward. (x, y, w, h) = where it was drawn. */
	shatter(
		img: HTMLImageElement,
		sx: number, sy: number, sw: number, sh: number,
		x: number, y: number, w: number, h: number,
		opts: ShatterOptions = {}
	) {
		const { step = 3, speed = 140, life = 700, gravity = 0, tint } = opts
		let pixels: Pixel[]
		try {
			pixels = this.samplePixels(img, sx, sy, sw, sh, w, h, step)
		} catch {
			// getImageData throws for cross-origin images: fall back to a plain burst
			this.burst(x + w / 2, y + h / 2, { colors: [tint ?? '#ffffff'] })
			return
		}
		const cx = w / 2, cy = h / 2
		for (const p of pixels) {
			if (this.particles.length >= MAX_PARTICLES) return
			const dx = p.ox - cx, dy = p.oy - cy
			const dist = Math.hypot(dx, dy) || 1
			const s = speed * (0.4 + Math.random() * 0.9)
			this.particles.push({
				x: x + p.ox,
				y: y + p.oy,
				vx: (dx / dist) * s + (Math.random() - 0.5) * 60,
				vy: (dy / dist) * s + (Math.random() - 0.5) * 60,
				g: gravity,
				life: 0,
				maxLife: life * (0.6 + Math.random() * 0.8),
				size: step,
				color: tint ?? p.color
			})
		}
	}

	/** Radial sparks from a point. */
	burst(x: number, y: number, opts: BurstOptions = {}) {
		const { count = 24, colors = ['#ffffff'], speed = 160, life = 600, size = 3, gravity = 0 } = opts
		for (let i = 0; i < count; i++) {
			if (this.particles.length >= MAX_PARTICLES) return
			const a = Math.random() * Math.PI * 2
			const s = speed * (0.3 + Math.random() * 0.9)
			this.particles.push({
				x, y,
				vx: Math.cos(a) * s,
				vy: Math.sin(a) * s,
				g: gravity,
				life: 0,
				maxLife: life * (0.6 + Math.random() * 0.8),
				size: size * (0.6 + Math.random() * 0.8),
				color: colors[Math.floor(Math.random() * colors.length)]
			})
		}
	}

	update(dt: number) {
		if (this.particles.length === 0) return
		const s = dt / 1000
		const drag = Math.pow(0.15, s) // keeps 15% of its speed after 1s, at any frame rate
		let w = 0
		for (const p of this.particles) {
			p.life += dt
			if (p.life >= p.maxLife) continue
			p.vx *= drag
			p.vy = p.vy * drag + p.g * s
			p.x += p.vx * s
			p.y += p.vy * s
			this.particles[w++] = p
		}
		this.particles.length = w
	}

	draw(ctx: CanvasRenderingContext2D) {
		if (this.particles.length === 0) return
		ctx.save()
		for (const p of this.particles) {
			const t = p.life / p.maxLife
			const size = p.size * (1 - t * 0.5)
			ctx.globalAlpha = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4 // solid, then fade out
			ctx.fillStyle = p.color
			ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size)
		}
		ctx.restore()
	}

	clear() {
		this.particles = []
	}

	// Samples the sprite once per unique (image, rect, size, step) and caches the result.
	private samplePixels(
		img: HTMLImageElement,
		sx: number, sy: number, sw: number, sh: number,
		w: number, h: number, step: number
	): Pixel[] {
		const key = `${img.src}|${sx}|${sy}|${sw}|${sh}|${w}|${h}|${step}`
		const hit = this.cache.get(key)
		if (hit) return hit

		const c = (this.scratch ??= document.createElement('canvas'))
		c.width = Math.ceil(w)
		c.height = Math.ceil(h)
		const g = c.getContext('2d', { willReadFrequently: true })!
		g.drawImage(img, sx, sy, sw, sh, 0, 0, w, h)
		const data = g.getImageData(0, 0, c.width, c.height).data

		const out: Pixel[] = []
		for (let py = 0; py < c.height; py += step) {
			for (let px = 0; px < c.width; px += step) {
				const cx = Math.min(c.width - 1, px + (step >> 1))
				const cy = Math.min(c.height - 1, py + (step >> 1))
				const i = (cy * c.width + cx) * 4
				if (data[i + 3] < 100) continue // transparent
				if (data[i] + data[i + 1] + data[i + 2] < 60) continue // near-black: invisible anyway
				out.push({ ox: px + step / 2, oy: py + step / 2, color: `rgb(${data[i]},${data[i + 1]},${data[i + 2]})` })
			}
		}
		this.cache.set(key, out)
		return out
	}
}