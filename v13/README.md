# SnowEngine 1.3 — smartphone-first ski controls

Four large touch controls only: **LEWO**, **PRAWO**, **GAZ**, **SKOK**. For a 360° trick, tap LEWO or PRAWO while airborne; holding the direction at takeoff also works. One trick per jump, 100 points on a completed rotation. The skier model rotates around Y in the **actual WebGL2 vertex and depth shaders**, not only in UI. Trick is canceled on early landing. The on-screen status reports the trick.

Left/right steering remains available on the ground, with normal world-space movement. Gas temporarily adds acceleration; the original slope, friction and speed cap still apply. Other touch controls were removed. Aerial camera remains, with optional small camera/zoom toolbar. Device: smartphone, especially landscape mode.

QA tests both phone landscape 844x390 and portrait 390x844, including touch pointer events, acceleration, jump and a completed 360°.

Existing geographic limitations remain: OpenSkiMap-derived route, coarsely sampled Mapzen DEM and no verified piste width. Previous /v12/ is unaffected.

Source: original SMR SnowEngine code, no external game assets.
