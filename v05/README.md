# SMR Pixel Ski 0.5 — ETAP I
Dedicated **Babylon.js 3D** prototype. This is a separate staging route, the production 0.4.2 remains unchanged while visuals are tested.

- **Staging:** https://pchojnowsky-stack.github.io/smr-pixel-ski/v05/
- New terrain as a real height-field mesh with computed normals, snow texture and groomed ribbon.
- Natural-height mountain slopes and broader surrounding forest.
- Elevated third-person aerial chase camera looking down about 50–55 degrees.
- Directional winter sunlight with real shadow maps, ambient skylight and light blue atmospheric haze.
- Spruce forest rendered as thin instances to reduce mobile draw calls.
- Existing touch steering, braking and ski run progress; new HUD.
- Early placeholder skier, chalet and moving chairlift for scale. These are not the final stage II–IV art assets.

**Scope and truthfulness:** Terrain is procedural and inspired by the resort, **not** surveyed SMR terrain data. Stage I focuses on engine, terrain, lighting, camera. It is not yet the final look of concept C. Screenshots, if attached, come from WebGL rendering or browser tests, not AI concept art.

## Local dev
Serve repository root via any static server, open /v05/. Babylon.js is loaded from its official CDN (internet required).
Run `node --check v05/game.js`. GitHub workflow `SMR 0.5 Visual QA` launches a Playwright browser and captures actual rendered screenshots at desktop and portrait viewports.

## Deployment
GitHub Pages automatically deploys main. After visual review of staging, point the default launch page at v05 while retaining the previous version through Git history.
