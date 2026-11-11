# SnowEngine 1.2 — new graphics engine from scratch

## Goal & reference
User's screenshot sets art direction, not a 3D asset source: high aerial chase camera, blue tree shadows, snow-covered conifers, groomed piste, moving lift and ski trails.

## Implemented stages
- I: engine.js - original WebGL2 shader pipeline, sun shadow depth map with 3x3 PCF, color grading, fog and instancing. No Babylon.js or Three.js.
- II: geometry.js - georeferenced 7m heightfield, procedural shaded snow, layered conifers with snow caps, buildings and lift.
- III: 1124 mapped forest positions, winter shadows, georeferenced B1 cable and moving chairs, 13 NPC skiers.
- IV: freeride.js - world-space skiing, aerial/near camera, zoom, tuck, jump, turns, pair of procedural tracks.
- V: Playwright actual WebGL2 landscape/portrait screenshots and touch validation.

## Limits
This implementation is not yet equivalent to the reference image in photorealistic quality. More accurate geometry and textures require 1m GUGiK NMT and verified piste polygon, authored/licensed spruce assets, triplanar snow normal maps, atmospheric postprocessing and Android GPU profiling.

OpenSkiMap centerline has 1686.4m vs 2014m catalog, true piste borders unmeasured. Individual trees are procedurally sampled within mapped OSM forests, not measured one by one.

Preview after merge: https://pchojnowsky-stack.github.io/smr-pixel-ski/v12/
Earlier versions remain unchanged.
