# SMR Alpine 0.8 — etap IV: architektura ośrodka

## Podgląd
Po scaleniu PR na main: https://pchojnowsky-stack.github.io/smr-pixel-ski/v08/

- Nienaruszone produkcyjne / oraz wcześniejsze /v06/ i /v07/.
- Osobny `resort.js`: dwie stacje kolei, ruch dwukierunkowy 16 krzeseł po zamkniętym obiegu, podpory i liny, taras z barem, znaki tras oraz 9 uproszczonych NPC.
- Zachowane sterowanie i moduł narciarza 0.7; NPC i krzesełka są ukrywane poza zasięgiem.
- QA: składnia oraz rzeczywisty WebGL Playwright w 1280×720 i 390×844, artefakty w Actions.

**Ważne:** prototyp proceduralny, a nie gotowy fotorealistyczny model zgodny 1:1 z koncepcją C i mapą Szczyrku. FPS na Androidzie wymaga pomiaru na urządzeniu. Nie scalamy automatycznie do main.

## Gameplay 0.8.1 — dynamic downhill
- Directional heading steering with edge response; turn radius tightens in ZJAZD/tuck stance.
- Higher speed in tuck, brake maintained, limited air steering and jump with gravity, cooldown and landing compression.
- Touch: ❮ / ❯, HAMUJ, ZJAZD, SKOK; keyboard: arrows/A/D, down, W/up/Shift, space.
- Physics isolated in `ride.js`; `ride.test.cjs` runs deterministic assertions; visual QA verifies controls and jump in WebGL.
