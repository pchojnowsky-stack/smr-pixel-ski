# SMR Pixel Ski 1.5 — Trasy, las, carving i dwa kije

Scena: `/v15/` na bazie SnowEngine 1.4. Wcześniejsze wersje pozostają nienaruszone.

## Wizualizacja
- `piste.js` dodaje słupki i odcinkowe siatki przy bardziej stromych / trudnych trasach.
- Pasy świerków poza trasami powstają proceduralnie, z odrzucaniem pozycji zbyt blisko dowolnej osi trasy.
- Siatki i granice tras są **wyłącznie przybliżoną wizualizacją**, nie odwzorowaniem geodezyjnym ani oficjalnym planem zabezpieczeń. Mapa tras pozostaje z OpenSkiMap w `v14/data`.

## Sterowanie
- Trzymaj LEWY KIJ albo PRAWY KIJ = carving.
- Trzymaj oba = pozycja zjazdowa, mniejszy opór powietrza.
- Dotknij obu krótko (mniej niż 250 ms) = skok, gdy na ziemi i prędkość > 5 m/s.
- W locie dotknij kierunku = 360° (o ile pozostało dostatecznie dużo czasu do lądowania).
- Komputer: A/D lub strzałki, Shift = tuck, Spacja = skok.

## Dynamika
Szybsza reakcja na zakręt, prędkość od nachylenia terenu, opór przy carvingu, lekki spadek prędkości po lądowaniu i kamera z zależnym od prędkości offsetem. To tuning prototypu, a nie realistyczny symulator.

## Weryfikacja
`node v15/physics.test.cjs` sprawdza fizykę. `v15/visual-qa.cjs` uruchamia rzeczywisty WebGL2 w Chromium i sprawdza orientacje 1280×720 oraz 390×844 z kontrolą dwóch przycisków, skoku i tricku. Wynikiem są prawdziwe screenshoty QA, nie ilustracje AI. FPS na docelowym telefonie pozostaje do zmierzenia.
