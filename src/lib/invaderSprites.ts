// src/lib/invaderSprites.ts
//
// The invader sheet (InvadersSpriteSheetFig.png) is a uniform grid, not
// the hand-measured bounding boxes MenuScreen/InvaderSystem originally
// used. Confirmed against config.svelte.ts's cInvader (48x36 cells) and
// verified pixel-for-pixel: every real sprite's tight bounding box falls
// cleanly inside its 48x36 cell with a few px of padding, and frame 1 of
// each type sits exactly 48px to the right of frame 0. So extraction is
// just: X = frame * CELL_W, Y = typeRow * CELL_H, width/height CELL_W/H —
// no per-sprite coordinates to hand-measure or keep in sync.

export const CELL_W = 48
export const CELL_H = 36

export type InvaderTypeName = 'squid' | 'crab' | 'octopus'

export const INVADER_TYPES: Record<InvaderTypeName, { points: number; row: number }> = {
	squid: { points: 30, row: 0 },
	crab: { points: 20, row: 1 },
	octopus: { points: 10, row: 2 }
}

export function invaderFrameRect(type: InvaderTypeName, frame: 0 | 1) {
	const { row } = INVADER_TYPES[type]
	return { x: frame * CELL_W, y: row * CELL_H, w: CELL_W, h: CELL_H }
}
