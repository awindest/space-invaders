# Space Invaders Design

## Background Info

I worked at a bar in New Orleans, LA, USA to put myself through a graduate program at LSU New Orleans. I got to work early with one quarter in my pocket and went upstairs to play the Space Invaders arcade game. I got good at it and would let someone else take over when it was time to go behind the bar. I would only spend one quarter. I have good memories of this game and my interest in the game was renewed after spending a month in Paris and searching for all of Invader's street art.

In an attempt to better understand Svelte/Sveltekit and declarative programming, I decided to 
code the classic Space Invaders game in Svelte.
Here's what I came up with for a Space Invaders game that uses Svelte 5's declarative model for structure and the UI but drives the game loop entirely through imperative canvas rendering — no Svelte reactivity in the hot path.

## Core Philosophy

With Claude's help:

Svelte reactivity  →  game config, UI overlays, state transitions
Game loop          →  requestAnimationFrame, imperative canvas draws
Runes              →  bridge between the two worlds (sparingly)

Svelte's reactivity should never be in your 60fps render loop. You use runes only for things that cross the boundary: score display, game phase (intro/insert-coin/playing/blown-up), lives count. The rendering needs to be imperative if you want a performant game. Claude helped me understand this declarative and imperative approach which I suppose you could call a dual approach or a hybrid strategy, or, to use corporate-speak, complementary paradigms.

## Project Layout using Sveltekit

```
+page.svelte
├── GameCanvas.svelte        ← owns canvas, context, RAF loop
│   ├── StarField.svelte     ← background stars; uses canvas
│   ├── SplashScreen.svelte  ← intro screen; uses canvas and events
│   ├── PlayerSystem.svelte  ← logic only, no DOM
│   ├── InvaderSystem.svelte ← logic only, no DOM
│   ├── MissleSystem.svelte  ← logic only, no DOM
│   └── CollisionSystem.svelte
└── HUD.svelte               ← pure Svelte reactivity (score, lives)
```
"Logic only" components hold state and expose draw/update functions — they render nothing themselves.

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
pnpm dlx sv@0.16.6 create --template minimal --types ts --add prettier eslint tailwindcss="plugins:none" sveltekit-adapter="adapter:static" --install pnpm space-invaders-claude
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
