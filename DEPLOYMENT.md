# GitHub Pages deployment

This repository is a Vite app deployed to GitHub Pages with the workflow in
`.github/workflows/deploy.yml`.

The workflow builds the production site with `npm run build`, verifies that the
Vite output in `dist/index.html` points at `/bodegadejuegos/assets/...` instead
of the source module `./src/main.js`, and uploads `./dist` with
`actions/upload-pages-artifact` for `actions/deploy-pages`.

## Required repository setting

GitHub Pages must use the Actions artifact from this workflow. In the GitHub UI,
the repository owner must set:

1. **Settings** → **Pages**.
2. **Build and deployment** → **Source**: **GitHub Actions**.

If Pages is set to **Deploy from a branch**, GitHub can keep serving the source
`index.html` from the branch. That source file is intentionally the Vite entry
point and contains `./src/main.js`; it is not the production Pages artifact.
