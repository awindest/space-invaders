import type { LevelConfig } from '$lib/types'

export const cInvader = {
    width: 48,
    height: 36,
    spritePositionX: 0,
    spritePositionY: 0,
    maxFrame: 1
}
// these are for scoring
// export const cInvaderTypes = ['conical','standard','oval']

export const cInvaderGrid = {
    rows: 5,
    columns: 11
}
export const cSpaceship = {
    width: 64,
    height: 28,
    speed: 1,
    cellX: 0,
    cellY: 0,
    spritePositionX: 0,
    spritePositionY: 108,
    maxFrame: 3
}
export const cInvaderMissile = {
    width: 20,
    height: 30,
    spritePositionX: 0,
    spritePositionY: 136,
    maxFrame: 3
}

// export const colorPerLevel = {
//     0: ["#03FF07", "#03FFFF", "#03FFFF", "#ff00ff", "#ff00ff"],
//     1: ["#ff00ff", "#ff00ff", "#FF0", "#FF0", "#F00"],
//     2: ["#03FFFF", "#ff00ff", "#ff00ff", "#FF0", "#FF0"]
// }


// Level definitions — progressively harder
export const cLevels: LevelConfig[] = [
	{ speedMultiplier: 1.0, fireRate: 100, missileSpeed: 4, invaderPattern: [1, 2, 2, 3, 3], colorPattern: ['#03FF07', '#03FFFF', '#03FFFF', '#ff00ff', '#ff00ff'] },
	{ speedMultiplier: 1.2, fireRate: 85,  missileSpeed: 4.5, invaderPattern: [1, 1, 2, 2, 3], colorPattern: ['#03FF07', '#03FF07', '#03FFFF', '#03FFFF', '#ff00ff'] },
	{ speedMultiplier: 1.4, fireRate: 70,  missileSpeed: 5, invaderPattern: [1, 1, 2, 3, 3], colorPattern: ['#03FF07', '#03FF07', '#03FFFF', '#ff00ff', '#ff00ff'] },
	{ speedMultiplier: 1.6, fireRate: 55,  missileSpeed: 5.5, invaderPattern: [1, 1, 1, 2, 2], colorPattern: ['#03FF07', '#03FF07', '#03FF07', '#03FFFF', '#03FFFF'] },
	{ speedMultiplier: 1.8, fireRate: 40,  missileSpeed: 6, invaderPattern: [1, 1, 1, 2, 3], colorPattern: ['#03FF07', '#03FF07', '#03FF07', '#03FFFF', '#ff00ff'] },
]

// Initial lives
export const cInitialLives = 3