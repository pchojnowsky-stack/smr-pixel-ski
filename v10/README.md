# SMR Pixel Ski 1.0 — Szumarjanka od nowa z OpenSkiMap

Grywalna scena /v10/ oparta na danych z oficjalnego OpenSkiMap API; nie modyfikuje /, /v08/, /v09/.

- Run 4 Szumarjanka: 35 punktów OSM-derived 3D GPS, rzeczywisty opis wysokości OpenSkiMap (ok. 977.8–650 m n.p.m.), długość geometrii 1686.4 m.
- B1: 10 punktów geolokalizowanych 3D; słupy są ilustracyjne (nie geodezyjnie zmierzone).
- Zrekonstruowano siatkę terenu ~7m dopasowaną do profilu narciarskiego, mieszając lokalne wysokości OpenSkiMap z globalnym DEM Mapzen; poza trasą wciąż nie jest to dokładny NMT 1 m.
- Zaktualizowane drzewa na podstawie faktycznych wielokątów lasu OSM, proste obrysy budynków OSM; rzeźba terenu i oświetlenie przeprojektowane.
- Zamiast sztucznej, unoszącej się wstęgi śnieżnej, przejście koloru na wysokości rzeźby stoku.
- Obsługa lewo/prawo, tuck, hamowanie, skok i kamera podążająca za osią.

## Ograniczenia
Nie twierdzimy, że stok jest 1:1. OpenSkiMap opiera swoją geometrię na OSM, więc długość jego osi to 1686.4 m wobec katalogowych 2014 m. Granice stoku nadal są niezmierzone: wizualne rozjaśnienie i wycięcie drzew odpowiadają przykładowemu otwarciu, a NIE mapie pomiarowej. Wysokości 3D wzdłuż osi są z OpenSkiMap, ale nieregularne pochylenia i szczegóły po bokach wymagają NMT GUGiK 1 m oraz ortofotomapy. Budynki i pojedyncze drzewa mają uproszczoną bryłę i uproszczone położenie wewnątrz mapowanego lasu.

Źródło API: https://api.openskimap.org/features.geojson?bbox=18.974%2C49.681%2C19.049%2C49.715%26types=run%2Clift
Implementacja API: https://github.com/russellporter/api.openskimap.org/blob/master/src/app.ts
© OpenStreetMap contributors (ODbL) — https://www.openstreetmap.org/copyright
OpenSkiMap/OpenSkiData — https://openskimap.org
Mapzen Terrain Tiles — https://registry.opendata.aws/terrain-tiles/
