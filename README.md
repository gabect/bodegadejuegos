# Bodega de Juegos

A simple static arcade landing page for the GitHub Pages site at:

<https://gabect.github.io/bodegadejuegos/>

This project is designed to work with **Settings → Pages → Deploy from a branch → main / root**. It does not require Vite, a build step, GitHub Actions, or a committed `dist/` directory.

## Project structure

```text
index.html                         # Static HTML entry point
games/jungle-snake/                # Static Jungle Snake game
games/reflex-80s/                  # Static Reflex 80s game
games/pixel-galaxy-defender/       # Static Pixel Galaxy Defender game
games/frontline-echo/              # Static Frontline Echo game
src/main.js                        # Plain browser JavaScript for the landing page
style.css                          # Landing page styles
.nojekyll                          # Keeps GitHub Pages from running Jekyll processing
```

## How it loads

The root `index.html` loads the landing page assets directly from the branch:

```html
<link rel="stylesheet" href="./style.css" />
<script src="./src/main.js" defer></script>
```

`src/main.js` is plain browser JavaScript. It does not import CSS, does not use Vite environment variables, and opens the game iframes with relative static paths:

- `./games/jungle-snake/`
- `./games/reflex-80s/`
- `./games/pixel-galaxy-defender/`
- `./games/frontline-echo/`

Those paths resolve correctly from:

<https://gabect.github.io/bodegadejuegos/>

## Local development

No build is required. Open `index.html` from a local static server rooted at this repository. For example:

```bash
python3 -m http.server 4173
```

Then visit:

<http://localhost:4173/>

Optional formatting and linting tools remain available through npm:

```bash
npm install
npm run lint
npm run format
```

## GitHub Pages deployment

Use this repository setting:

**Repository Settings → Pages → Build and deployment → Source → Deploy from a branch → Branch: main / root**

After pushing to `main`, GitHub Pages serves the files directly from the repository root. The landing page and iframe games do not depend on GitHub Actions, Vite, `npm run build`, or `dist/`.
