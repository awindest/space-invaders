// src/lib/sotes/GameStore.svelte.ts
//
// This is the only place Svelte reactivity touches game data.
// The HUD reads from it; the game loop writes to it (infrequently — on kills, death, etc).

import { cInitialLives } from '$stores/config.svelte'

export type Phase = 'insertCoin' | 'menu' | 'playing' | 'levelIntro' | 'gameover' | 'win'

const HIGH_SCORE_KEY = 'spaceInvadersHighScore'

export function loadHighScore(): number {
	if (typeof window === 'undefined') return 0
	try {
		const n = parseInt(localStorage.getItem(HIGH_SCORE_KEY) ?? '', 10)
		return Number.isFinite(n) ? n : 0      // was: could return NaN
	} catch {
		return 0
	}
}

export function saveHighScore(score: number): void {
	if (typeof window === 'undefined') return
	try {
		localStorage.setItem(HIGH_SCORE_KEY, String(score))
	} catch {
		// localStorage not available
    console.error("In saveHighScore: local storage not available.")
	}
}

export const gameState = $state({
  phase: 'insertCoin' as Phase,
  score: 0,
  lives: cInitialLives,
  level: 1,
  highScore: loadHighScore(),
  shotsFired: 0,
  muted: true
});

export function resetGame() {
	gameState.score = 0
	gameState.lives = cInitialLives
	gameState.level = 1
	gameState.shotsFired = 0
}

export function commitHighScore() {
	if (gameState.score > gameState.highScore) {
		gameState.highScore = gameState.score
		saveHighScore(gameState.score)
	}
}