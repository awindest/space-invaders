// src/lib/AudioStore.svelte.ts
//

import { Howl, Howler } from 'howler'
import { gameState } from './GameStore.svelte'

// --- Audio files ---

import backgroundMusic from '$audio/BackgroundMusic.mp3'
import insertCoin from '$audio/Insert-coin-fx_C_major.mp3'
import start from '$audio/Start.mp3'
import playerMissile from '$audio/PlayerMissile.mp3'
import playerExplosion from '$audio/PlayerExplosion.mp3'
import invaderShoot from '$audio/InvaderShoot.mp3'
import invaderWalk from '$audio/InvaderWalk.mp3'
import invaderExplosion from '$audio/InvaderExplosion.mp3'
import spaceshipWooWoo from '$audio/SpaceshipWooWoo.mp3'
import bonusScore from '$audio/Bonus.mp3'
import gameOver from '$audio/GameOver.mp3'

// --- Types ---
export interface AudioEntry {
	id: string
	name: string
	file: string
	loop: boolean
}

// --- Audio Registry ---
export const audioEntries: AudioEntry[] = [
	// Music
	{ id: 'background-music', name: 'Background Music', file: backgroundMusic, loop: true },
	// Game State
	{ id: 'insert-coin', name: 'Insert Coin', file: insertCoin, loop: false },
	{ id: 'start', name: 'Start', file: start, loop: false },
	// Player Actions
	{ id: 'player-missile', name: 'Player Missile', file: playerMissile, loop: false },
	{ id: 'player-explosion', name: 'Player Explosion', file: playerExplosion, loop: false },
	// Enemies
	{ id: 'invader-shoot', name: 'Invader Shoot', file: invaderShoot, loop: false },
	{ id: 'invader-walk', name: 'Invader Walk', file: invaderWalk, loop: false },
	{ id: 'invader-explosion', name: 'Invader Explode', file: invaderExplosion, loop: false },
	// Special
	{ id: 'spaceship-woo-woo', name: 'Spaceship Woo Woo', file: spaceshipWooWoo, loop: true },
	{ id: 'bonus-score', name: 'Bonus Score', file: bonusScore, loop: false },
	{ id: 'game-over', name: 'Game Over', file: gameOver, loop: false }
]

// --- Store ---
function createAudioStore() {
	let playingStates = $state<Record<string, boolean>>({})
	const howls: Record<string, Howl> = {}
	let initialized: boolean = false

	function init() {
		if (initialized) return
		initialized = true

		for (const entry of audioEntries) {
			const howl = new Howl({
				src: [entry.file],
				loop: entry.loop,
				volume: entry.id === 'background-music' ? 0.4 : 0.7,
				preload: true,
				onplay: () => {
					playingStates = { ...playingStates, [entry.id]: true }
				},
				onend: () => {
					if (!entry.loop) {
						playingStates = { ...playingStates, [entry.id]: false }
					}
				},
				onstop: () => {
					playingStates = { ...playingStates, [entry.id]: false }
				},
				onpause: () => {
					playingStates = { ...playingStates, [entry.id]: false }
				}
			})
			howls[entry.id] = howl
		}
		Howler.mute(gameState.muted)
	}

	function dispose() {
		for (const id of Object.keys(howls)) {
			howls[id].unload()
			delete howls[id]
		}
		initialized = false
	}

	function play(id: string) {
		const howl = howls[id]
		if (!howl) return
		// Restart on replay, except missiles — rapid-fire needs overlapping
		// instances rather than one that keeps getting cut off and restarted.

		if (howl.playing()) {
			if (howl.loop()) return                 // looping track already running: leave it alone
			if (id !== 'player-missile') howl.stop()
		}
		howl.play()
	}

	function stop(id: string) {
		howls[id]?.stop()
	}

	function stopAll() {
		for (const id of Object.keys(howls)) {
			howls[id].stop()
		}
	}

	function toggleMute() {
		gameState.muted = !gameState.muted
		Howler.mute(gameState.muted)
	}

	function isPlaying(id: string): boolean {
		return playingStates[id] ?? false
	}

	function changeRate(id: string, rate: number) {
		const howl = howls[id]
		if (!howl) return

		// changeRate: Howler's valid range is 0.5–4
		if (rate < 0.5 || rate > 4) { console.error('AudioStore: rate must be 0.5–4'); return }

		howl.rate(rate)
	}

	return {
		get muted() {
			return gameState.muted
		},
		get playingStates() {
			return playingStates
		},
		init,
		dispose,
		play,
		stop,
		stopAll,
		toggleMute,
		isPlaying,
		changeRate,
		audioEntries
	}
}

// singleton, audio factory
export const audioStore = createAudioStore()
