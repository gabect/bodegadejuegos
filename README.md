# Sniper: Jungle Mission

A static GitHub Pages HTML5 arcade game built with Phaser and procedural drawing. The player views the jungle only through a first-person sniper scope, tags five hidden enemies, and must finish the mission with six shots before the 60-second timer expires.

Live site target:

<https://gabect.github.io/bodegadejuegos/>

## Project structure

```text
index.html        # Static HTML entry point with Phaser and GSAP CDN scripts
style.css         # Full-page GitHub Pages game shell styles
game.js           # Phaser game logic, procedural visuals, HUD, controls, mission state
.nojekyll         # Keeps GitHub Pages from running Jekyll processing
games/            # Previous static games retained in the repository
src/              # Previous landing-page JavaScript retained for reference
```

## Gameplay

- Mission: tag 5 hidden hostiles in one procedural jungle scene.
- Resources: 6 shots and 60 seconds.
- Controls: move the mouse to aim, click to shoot.
- View: first-person scope only; no weapon is displayed.
- Visuals: all scenery, enemies, foliage, HUD, scope, and crosshair are generated with code. No external image assets are used.

## How it loads

The root `index.html` loads only local project files plus the required CDN libraries:

```html
<link rel="stylesheet" href="style.css" />
<script src="https://cdn.jsdelivr.net/npm/phaser@3.90.0/dist/phaser.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js"></script>
<script src="game.js"></script>
```

This works directly from GitHub Pages with **Settings → Pages → Deploy from a branch → main / root**. No bundler, build output, or GitHub Action is required.

## Local development

Open the repository through any static server:

```bash
python3 -m http.server 4173
```

Then visit:

<http://localhost:4173/>

Optional checks:

```bash
node --check game.js
npx eslint game.js
npm run lint
```
