# SMR Pixel Ski — 0.4.2

Stylizowany narciarski prototyp 3D do testowania na Androidzie i iPhone.

**Graj:** https://pchojnowsky-stack.github.io/smr-pixel-ski/?v=0.4.2

## Wersja 0.4.2
- Poprawione kolory i oświetlenie stoku, mniej mgły, bar bliżej trasy.
- Przebudowana sylwetka narciarza z goglami, plecakiem, nogami i kijkami.
- Bardziej rozbudowane zaśnieżone drzewa, budynki i tarasy.
- Kamera za narciarzem, jazda z hamowaniem i zbieraniem gwiazdek.
- Sterowanie dotykowe, test w 1280x720 i 720x1280.
- Własny renderer WebGL bez zewnętrznych zależności.

**Ważne:** gra to wciąż wczesny, proceduralny prototyp low-poly. Wizualna jakość modeli i otoczenia nie dorównuje jeszcze szczegółowości koncepcyjnej ilustracji C; nadal wymagane są autorskie modele, tekstury i optymalizacja dla docelowego efektu.

## Tani agent do szybkich korekt
W repo istnieje **SMR Tune Agent** (GitHub Actions), który zmienia parametry bez konieczności edycji game.js:
- Komentarz do własnego issue: `/tune cameraDistance 32`, `/tune skierScale 1.1`
- Lub Actions → SMR Tune Agent - quick changes → Run workflow.
Agent obsługuje tylko znane wartości, nie wymaga AI API, a commit wyzwala GitHub Pages.
Pełne instrukcje dla asystenta programistycznego są w `AGENTS.md`.

## Rozwój gry
Otwórz repo na telefonie; zmiany kodu i zbiorcze commity mogą być wdrażane przez ChatGPT. `node tools/check.mjs` sprawdza składnię, ustawienia i zawartość interfejsu. Publikacja na Pages następuje po udanym teście.

## Sterowanie
❮ / ❯ — skręcanie, HAMUJ — spowalnianie, II — pauza.
Ekran poziomy daje najlepszą perspektywę.
