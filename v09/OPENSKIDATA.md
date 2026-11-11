# OpenSkiMap / OpenSkiData — importer trasy nr 4

Zintegrowano **porównywanie** geometrii tras OpenSkiData GeoJSON z bazowym śladem OpenStreetMap (way/202733799). Nie wymuszamy sztucznie zgodności odcinka 1686 m z katalogową długością 2014 m.

## Źródła i licencje

- [OpenSkiMap](https://github.com/russellporter/openskimap.org) — mapa i aplikacja.
- [OpenSkiData Processor](https://github.com/russellporter/openskidata-processor) — przetwarza OSM i dane Skimap.org w GeoJSON, m.in. `runs.geojson`, `lifts.geojson`.
- [OpenSkiData – Downloads](https://www.openskidata.org/) — oficjalne pobranie skompresowanego GeoJSON; automatyczne pobieranie najwyżej raz dziennie; NIE pobierać bezpośrednio kafelków `tiles.openskimap.org`.
- [OpenSkiData Run properties](https://github.com/russellporter/openskidata-format/blob/master/src/Run.ts) — jeden fizyczny stok może zawierać wiele segmentów.
- © OpenStreetMap contributors, ODbL; sprawdzić warunki źródeł i atrybucji.

## Użycie

1. Pobierz `runs.geojson` ze strony OpenSkiData zgodnie z warunkami udostępniania i rozpakuj plik.
2. Uruchom:
```bash
python tools/compare_openskidata.py --runs downloads/runs.geojson --scene v09/data/scene.json --out v09/data/openskidata-comparison.json
```
3. Przejrzyj raporty `potential_matches` — zawierają nazwę/ref, długości, odchylenie osi, niedopasowanie początku i końca, źródła. Wykonaj kontrolę ręczną po ortofotomapie.

**Bezpieczne zachowanie:** porównywarka nie podmienia osi gry ani nie wyznacza szerokości trasy z odcinka liniowego. Polygon nie jest automatycznie osią. Do dokładnych wysokości użyć NMT GUGiK przez `tools/terrain_builder.py`.

**Status:** kod i testy gotowe. Pełny plik OpenSkiData jeszcze nie został pobrany; wyniki testów z syntetycznymi geometriami nie są pomiarem terenu.
