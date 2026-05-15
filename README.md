# Arcade Jungle

A static GitHub Pages arcade library. The root homepage is a game selection menu, and each individual game lives in its own folder under `games/`.

Live site target:

<https://gabect.github.io/bodegadejuegos/>

## Project structure

```text
index.html                         # Static Arcade Jungle library homepage
games/jungle-snake/                # Static Jungle Snake game
games/reflex-80s/                  # Static Reflex 80s game
games/pixel-galaxy-defender/       # Static Pixel Galaxy Defender game
games/frontline-echo/              # Static Frontline Echo game
games/climbing-jungle-escape/      # Static Climbing Jungle Escape game
games/sniper-jungle-mission/       # Static Sniper: Jungle Mission game
src/main.js                        # Plain browser JavaScript for embedded landing-page games
style.css                          # Landing page styles
.nojekyll                          # Keeps GitHub Pages from running Jekyll processing
```

## Homepage/game separation

The root `index.html` is only the Arcade Jungle library homepage. It loads the landing page assets directly from the branch:

```html
<link rel="stylesheet" href="./style.css" />
<script src="./src/main.js" defer></script>
```

The root homepage does not load Phaser, GSAP, a game canvas, or any individual game script. `src/main.js` is plain browser JavaScript. It does not import CSS, does not use Vite environment variables, and opens the embedded game iframes with relative static paths:

- `./games/jungle-snake/`
- `./games/reflex-80s/`
- `./games/pixel-galaxy-defender/`
- `./games/frontline-echo/`
- `./games/climbing-jungle-escape/`

The Sniper: Jungle Mission card links directly to a separate page:

- `./games/sniper-jungle-mission/`

Only `games/sniper-jungle-mission/index.html` imports Phaser, GSAP, and `games/sniper-jungle-mission/game.js`.

Those paths resolve correctly from:

<https://gabect.github.io/bodegadejuegos/>

## Sniper: Jungle Mission gameplay

- Mission: tag 5 hidden hostiles in one procedural jungle scene.
- Resources: 6 shots and 60 seconds.
- Controls: move the mouse to aim, click to shoot.
- View: first-person scope only; no weapon is displayed.
- Visuals: all scenery, enemies, foliage, HUD, scope, and crosshair are generated with code. No external image assets are used.

## Local development

Open the repository through any static server:

```bash
python3 -m http.server 4173
```

Then visit:

<http://localhost:4173/>

Optional checks:

```bash
node --check src/main.js
node --check games/sniper-jungle-mission/game.js
npm run lint
```

## GitHub Pages deployment

Use this repository setting:

**Repository Settings → Pages → Build and deployment → Source → Deploy from a branch → Branch: main / root**

After pushing to `main`, GitHub Pages serves the files directly from the repository root. The landing page, iframe games, and separate-page games do not depend on GitHub Actions, Vite, `npm run build`, or `dist/`.
