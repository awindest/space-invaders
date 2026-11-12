// types.ts
import type { ParticleSystem } from '$lib/ParticleSystem'

export interface CanvasContext {
	canvas: HTMLCanvasElement | null
	ctx: CanvasRenderingContext2D | null
	width: number   // logical (CSS) pixels, NOT bitmap pixels
	height: number
	particles: ParticleSystem
}

export interface Props {
  // Add a question mark to make it optional
  children?: import('svelte').Snippet; 
}

export interface PositionType {
    x: number;
    y: number;
}

export interface VelocityType {
    x: number;
    y: number;
}

export interface LevelConfig {
    speedMultiplier: number;
    fireRate: number;       // frames between invader shots (lower = more frequent)
    missileSpeed: number;   // invader missile velocity
    invaderPattern: number[]; // sprite row per grid row [top → bottom]
    colorPattern: string[];   // color per grid row
}
