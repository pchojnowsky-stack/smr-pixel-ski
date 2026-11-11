# SMR 1.1 — Aerial Freeride

Nowa eksperymentalna wersja gry zainspirowana dostarczonym przez użytkownika kadrem rozgrywki narciarskiej. To **gra 3D**, nie ilustracja kadru.

### Mechanika
- Swobodne sterowanie narciarzem po całej dostępnej siatce terenu 3D, bez przywiązywania do osi stoku. Brzegi siatki pozostają nieprzekraczalne (brak danych poza obszarem).
- Dynamiczne skręty prawo/lewo, pozycja zjazdowa (większa prędkość i mniejszy promień skrętu), hamowanie, skok i lądowanie.
- Kamera lotnicza wysoko z tyłu, przełączanie na bliską kamerę i regulacja zoomu.
- Dwa proceduralne ślady nart na śniegu; śnieżne rozpryski z istniejącego modelu narciarza.
- Lasy ze śnieżnymi świerkami, syntetyczne cienie drzew, wyciąg B1 i narciarze NPC.
- Dotyk oraz klawiatura: ←/→ lub A/D, W/↑/Shift pozycja, S/↓ hamuj, spacja skok, C kamera, +/- zoom.

### Geometria i ograniczenia
- Wysokości wzdłuż osi Szumarjanki OpenSkiMap/OpenSkiData; teren poza osią wciąż opiera się na coarse Mapzen DEM.
- Drzewa próbkowane *w poligonach lasu OSM*, pojedyncze pnie nie są zmierzone.
- Brak pomiaru szerokości i rzeczywistych granic trasy, brak NMT GUGiK 1m; scenografia i tory NPC są uproszczone.
- Widok i oświetlenie inspirowane kadrem użytkownika, nie kopiują żadnych chronionych modeli gry ani kodu.
- Playwright WebGL QA na ekranach 1280×720 i 390×844; deterministic ski physics tests.

### Test
Po merge: https://pchojnowsky-stack.github.io/smr-pixel-ski/v11/
Wszystkie wcześniejsze wersje pozostają dostępne.
