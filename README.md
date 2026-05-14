# Bodega de Juegos

A Vite-powered arcade landing page for the GitHub Pages site at:

<https://gabect.github.io/bodegadejuegos/>

The landing page opens the preserved static browser games from `public/games/` inside the arcade cabinet window.

## Project structure

```text
index.html                         # Vite HTML entry point
src/main.js                        # Landing page behavior and game route mapping
style.css                          # Landing page styles
public/games/jungle-snake/         # Static Jungle Snake game
public/games/reflex-80s/           # Static Reflex 80s game
public/games/pixel-galaxy-defender/ # Static Pixel Galaxy Defender game
public/games/frontline-echo/       # Static Frontline Echo game
.github/workflows/deploy.yml       # GitHub Pages deployment workflow
vite.config.js                     # Vite configuration for the Pages base path
```

## Local development

Install dependencies and start Vite:

```bash
npm install
npm run dev
```

Build the production site:

```bash
npm run build
```

The production build is written to `dist/`. The `dist/` directory is intentionally ignored and should not be committed for this GitHub Actions deployment strategy.

## GitHub Pages deployment

This repository deploys with GitHub Actions, not by committing a built `dist/` folder to a branch.

The workflow in `.github/workflows/deploy.yml` runs on pushes to `main` and manual `workflow_dispatch` runs. It:

1. Checks out the repository.
2. Installs dependencies with `npm install`.
3. Builds the Vite site with `npm run build`.
4. Verifies that `dist/index.html` uses compiled assets under `/bodegadejuegos/assets/` and does not reference `./src/main.js`.
5. Uploads `./dist` with `actions/upload-pages-artifact`.
6. Publishes the uploaded artifact with `actions/deploy-pages`.

The Vite base path is configured in `vite.config.js`:

```js
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/bodegadejuegos/',
});
```

That base path is required so the deployed HTML references built assets like `/bodegadejuegos/assets/...` and the landing page opens games at:

- `/bodegadejuegos/games/jungle-snake/`
- `/bodegadejuegos/games/reflex-80s/`
- `/bodegadejuegos/games/pixel-galaxy-defender/`
- `/bodegadejuegos/games/frontline-echo/`

`src/main.js` uses `import.meta.env.BASE_URL` to construct these game URLs safely for GitHub Pages.

## Required repository setting

The repository owner must confirm this setting in GitHub:

**Repository Settings → Pages → Build and deployment → Source → GitHub Actions**

If GitHub Pages is still set to **Deploy from a branch**, GitHub may continue serving the source `index.html` from the branch. The source `index.html` is the Vite entry point and references `./src/main.js`; only the built `dist/index.html` should be served in production.
