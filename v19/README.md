# SMR Pixel Ski 1.9 — ARCADE / szybki zjazd

Niezależna wersja `/v19/` oparta o sprawdzony geograficzny silnik `/v17/`. Dane
terenowe GUGiK NMT z v17 i trasy OpenSkiMap pozostają zachowane.

## Fizycznie grywalne arcade
- Start: około **83 km/h** (23 m/s) zamiast 43 km/h.
- Przyspieszenie: wyraźnie większe na trasie; możliwe prędkości ponad 110 km/h.
- Ograniczenie prędkości w samej grze: 194 km/h (54 m/s).
- Natychmiastowe kierowanie: LEWO = ujemna zmiana `heading`, PRAWO = dodatnia;
  przy skręcie zmienia się rzeczywista pozycja x/z, nie tylko pozycja ciała.
- Mocniejsze i bardziej zdecydowane carvingowe zakręty.
- Pozycja zjazdowa obu przycisków zmniejsza opór powietrza.
- Skok (krótko oba przyciski), obroty 360° i punktowanie pozostają.

To celowo **arcade**, a nie realistyczny symulator narciarski.

## HUD 1.9
- Duży, gamingowy prędkościomierz z oddzielną etykietą **km/h**
  i paskiem tempa.
- Osobny licznik punktów za tricki.
- Neonowa typografia, ciemne półprzezroczyste panele.
- Duże dotykowe przyciski **◀ LEWO** i **PRAWO ▶**.
- Podział dla poziomu telefonu, pionu i komputerów.
- Klawiatura: strzałki/A/Q do skrętu w lewo, strzałki/D/E w prawo,
  W/Shift to tuck, spacja do skoku.

## Testy
`node v19/arcade.test.cjs` — różnica pozycji postaci po skręcie w lewo/prawo,
brak opóźnienia, duża prędkość, przyspieszenie, tuck, skok.
`v19/visual-qa.cjs` — WebGL2 w rzeczywistym Chromium z widokami
1280×720 oraz 390×844 i trzema sektorami Szczyrku, zrzuty ekranów
i prawdziwy hit-testing przycisków.
Wydajność FPS na fizycznym telefonie musi zostać oddzielnie zmierzona.

## Niezależny etap geolokalizacji lasów i budynków
Niedokończony import OSM z v18 ma odrębny Pull Request #31. Nie blokuje
tej aktualizacji arcade — nie przedstawiamy jego zmian jako już opublikowanych.

Po scaleniu: https://pchojnowsky-stack.github.io/smr-pixel-ski/v19/
