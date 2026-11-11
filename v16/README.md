# SMR Pixel Ski — etap 1.6: relief stoków i architektura ośrodka

Wersja demonstracyjna: `/v16/` (po scaleniu do `main`).

## Co poprawiono
- Cieniowanie terenu oparte na pochodnych siatki wysokościowej: mocniejsze plastyczne światło zboczy, odróżnienie wyratrakowanych obszarów i zboczy oraz detale śniegu. **Nie zmieniamy wysokości źródłowych.**
- Nachylenie w czasie jazdy: lokalny przybliżony spadek procentowy i kąt obliczone z DEM w kierunku narciarza.
- Budynki na podstawie zachowanych obrysów OSM, a nie prostych bounding boxów: ściany poligonowe, dachy wielospadowe, drewniane pasy elewacji, cokoły, okna, ciemne dachy i taras wybranych obiektów w rejonie górnej stacji B1.
- Terminale i podpory kolei z ciemnymi przeszkleniami, rolkami, belkami i wyraźną konstrukcją.
- Rozróżnienie typów: A1 (10-osobowa kolej gondolowa), B1/B2 (6-osobowe kanapy), B3/B4 (4-osobowe kanapy COS), B6 (kanapy), C10 (orczyk). Pojazdy przesuwają się wzdłuż długości liny; zawracanie wygładzone przy stacjach.
- Zachowane sterowanie dwoma kijami, carving, skoki i wybór trasy.

## Weryfikacja i ograniczenia dokładności
Źródło wysokości: Mapzen Terrarium z12, interpolowane do lokalnej siatki około 14 metrów. Nie jest to LiDAR ani NMT GUGiK 1 m, dlatego małe uskoki i mikroreliefy nie są odwzorowane geodezyjnie. Również szerokości tras i lokalizacje ogrodzeń są poglądowe. Wygląd budynków oparto na fotograficznych cechach infrastruktury Szczyrk Mountain Resort, ale konkretne elewacje, podziały okien, dokładne dachy i tarasy są rekonstrukcjami proceduralnymi, a nie fotogrametrią 1:1.

## Referencje
- https://www.bergfex.pl/czyrna-solisko/panorama/ — typy wyciągów B1/B2, A1, C10 i geometria tras.
- https://szczyrk.pl/koleje-linowe-1/szczyrk-mountain-resort — opis stacji gondoli i gondoli 10-osobowej.
- https://slaskie.travel/poi/1012125/szczyrk-mountain-resort — dolna stacja, usługi, infrastruktura.
- © OpenStreetMap contributors ODbL, OpenSkiMap/OpenSkiData, Mapzen terrain tiles (zestaw `v14/data`).

## Testy
GitHub Actions: składnia i fizyka + realny WebGL2 w Chromium 1280×720 i 390×844, rzeczywiste screenshoty jako artefakt CI. Wynik na prawdziwym Androidzie musi zostać zmierzony osobno.
