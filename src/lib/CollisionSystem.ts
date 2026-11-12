// src/lib/CollisionSystem.ts
//
// Not a Svelte component: collision checks are pure per-frame logic with
// no persistent state, no canvas drawing, and nothing to bind:this to.
// A plain function GameCanvas calls each frame is simpler than wrapping
// it in a component just to get a consistent look with the other systems.

import { audioStore } from '$stores/AudioStore.svelte'

type Rect = { x: number; y: number; w: number; h: number }

function rectsOverlap(a: Rect, b: Rect): boolean {
	return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

// Structurally typed against just the methods needed — PlayerSystem and
// InvaderSystem satisfy these without CollisionSystem importing their
// component types directly.
export interface FireballSource {
	getFireballRects(): (Rect & { ref: unknown })[]
	destroyFireball(ref: unknown): void
}
export interface InvaderTarget {
	getInvaderRects(): (Rect & { ref: unknown })[]
	destroyInvader(ref: unknown): void
}
export interface MissileSource {
	getMissileRects(): (Rect & { ref: unknown })[]
	destroyMissile(ref: unknown): void
}
export interface PlayerTarget {
	getPlayerRects(): (Rect & { ref: unknown })[]
	destroyPlayer(ref: unknown): void
}
export function checkFireballCollisions(player: FireballSource, invaders: InvaderTarget) {
	const fireballs = player.getFireballRects()
	const invaderRects = invaders.getInvaderRects()

	for (const fireball of fireballs) {
		for (const invader of invaderRects) {
			if (rectsOverlap(fireball, invader)) {
				player.destroyFireball(fireball.ref)
				invaders.destroyInvader(invader.ref)
				audioStore.play('invader-explosion')
				break // this fireball is spent — stop checking it against more invaders
			}
		}
	}
}


export function checkMissileCollisions(missileSource: MissileSource, player: PlayerTarget) {
	const missiles = missileSource.getMissileRects()
	const playerRects = player.getPlayerRects()

	for (const missile of missiles) {
		for (const playerRect of playerRects) {
			if (rectsOverlap(missile, playerRect)) {
				missileSource.destroyMissile(missile.ref)
				player.destroyPlayer(playerRect.ref)
				audioStore.play('player-explosion')
				break // this missile is spent — stop checking it against more player rects
			}
		}
	}
}
export interface UfoTarget {
	getUfoRects(): (Rect & { ref: unknown })[]
	destroyUfo(ref: unknown): void
}

export function checkFireballVsUfo(player: FireballSource, ufo: UfoTarget) {
	const fireballs = player.getFireballRects()
	const ufoRects = ufo.getUfoRects()
	if (ufoRects.length === 0) return // nothing in flight, skip the sweep

	for (const fireball of fireballs) {
		for (const ufoRect of ufoRects) {
			if (rectsOverlap(fireball, ufoRect)) {
				player.destroyFireball(fireball.ref)
				ufo.destroyUfo(ufoRect.ref)
				audioStore.play('bonus-score') // swap for whatever key you register
				break // this fireball is spent
			}
		}
	}
}