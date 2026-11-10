# SMR Pixel Ski — agent instructions
This repository is a mobile-first browser ski game. Main user edits it from ChatGPT on Android and tests on GitHub Pages.

## Artistic target
Variant C: polished third-person downhill camera, lively retro low-poly / pixel-3D resort, lush snow-covered trees, recognizable buildings, chairlifts, moving gondolas and human-proportioned skiers. Avoid giant blocky character, washed-out snow, empty mountain scenery and cinematic screenshots that the engine cannot reproduce. The 2026-11-10 user screenshot 0.3 was explicitly rejected. This is an iterative game, not a real-world NMT map; do not claim 1:1 SMR fidelity.

## App
- index.html: responsive touch-first HUD with built-in buttons; links config.js then game.js.
- config.js: low-cost camera/visual settings; values validated by tools/check.mjs.
- game.js: dependency-free custom WebGL mesh renderer; geometry, resort objects, skier and downhill simulation.
- GitHub Pages auto deploys when main changes. Avoid Railway; the connected account's trial was exhausted.

## Reduce time and cost
1. For camera/zoom/skier scale/render resolution changes edit **config.js only** (no rebuild), or dispatch SMR Tune Agent.
2. For graphics code changes, edit only affected functions and create ONE atomic commit containing all changes. No repetitive full-file GitHub commits or redundant deploys.
3. Run `node tools/check.mjs` and visual Playwright screenshots at 1280x720 and 720x1280 before publishing.
4. Use unique cache-busting ?v on scripts for a new release.
5. Never call a screenshot 'actual gameplay' unless rendered by the game engine. Include performance notes.
6. Keep WebGL mobile usable at 30 fps and avoid remote runtime assets.
7. Don't delete previous versions from Git history; every release must be revertible.

## SMR Tune Agent (GitHub Actions, zero AI-token cost)
On a repository Issue, a maintainer can comment:
`/tune cameraDistance 30`
or `/tune skierScale 1.12`
or run Actions > SMR Tune Agent - quick changes > Run workflow. The bot validates inputs, commits config.js and GitHub Pages republishes. Allowed values:
cameraDistance 19..60, cameraHeight 12..50, cameraLead 14..70, skierScale 0.6..1.4, renderScale 0.55..1.
This is **not** a self-directed generative AI coder. It is a deterministic, safe tuning bot. For new models/features, ask the coding assistant to modify game.js via GitHub and test.
