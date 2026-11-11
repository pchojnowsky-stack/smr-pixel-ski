# SMR Pixel Ski 1.7 — GUGiK NMT + indywidualna zabudowa Hali Skrzyczeńskiej

## Co jest nowego

### Rzeczywisty numeryczny model terenu
Oficjalna usługa GUGiK WCS pod adresem
`https://mapy.geoportal.gov.pl/wss/service/PZGIK/NMT/GRID1/WCS/DigitalTerrainModelFormatTIFF`
dostarcza raster GeoTIFF na podstawie źródłowego modelu NMT o siatce 1 m.
`tools/build_smr17_nmt.py` pobiera rzeczywiste fragmenty (WCS 1.0, EPSG:2180),
pobiera dane wyjściowe o próbkowaniu ~3 m i interpoluje do **8-metrowej siatki gry**.

NIE jest prawdą, że gra renderuje każdy punkt LiDAR co 1 m: szczegóły
poniżej 8 m nie są przedstawiane jako oddzielne wierzchołki. Zmiana ma na celu
poprawienie rzeczywistego spadku terenu, przy zachowaniu wydajności mobilnej.

Wynik jest zapisywany jako `v17/data/<sektor>.json` (int16 decymetry + base64).
Każdy plik niesie jawne pochodzenie, pokrycie źródłowe, skalę siatki, przesunięcie
wysokości do lokalnego układu gry, rzeczywistą rozdzielczość próbkowania.
Aplikacja nie stosuje pliku oznaczonego jako GUGiK, jeśli nie przeszedł walidacji.
Dopóki plików brak, HUD wyświetla **Mapzen z12 ~14 m**, bez fałszywej etykiety NMT.

Wysokości są odnoszone do bazowej wysokości gry 650 m za pomocą przesunięcia mediany
względem dotychczasowego rastra. Dlatego wysokości w grze nie są bezpośrednio
mierzonymi rzędnymi KRON86; model zachowuje lokalną geometrię spadków.
Punkty na osiach tras i wyciągów dostosowywane są do nowej powierzchni.

### Indywidualne obiekty Hali Skrzyczeńskiej
Autorskie, proceduralne bryły w `v17/landmarks.js`:
- **Kuflonka — model inspirowany zdjęciami**: drewniana elewacja i listwy, cokoły,
  panoramiczne pasy szkła, ciemny dach, duży taras z balustradą, ławy i stoliki.
  Kotwica w sąsiedztwie górnej stacji B1 oraz obrys budynku
  OSM `way/657912056`; **przypisanie tego konkretnego obrysu do Kuflonki
  nie zostało niezależnie geodezyjnie potwierdzone**.
- **Gondola A1 dolna stacja**: osobny ciemny terminal, pionowe profile metalowe,
  szklane wejście, strefa bramek, dojścia i wiaty kasowe.
- **Gondola A1 górna stacja**: kompaktowy osobny terminal, osłony napędu,
  pas przeszklenia, rząd słupków bramkowych.
- **B1**: para osobnych zadaszonych terminali kanapy.

Poprzednie uproszczone modele stacji A1/B1 i wybranego obrysu są wyłączone,
aby nie nakładały się na nowe modele. Położenie terminali wykorzystuje
końce osi kolei OpenSkiMap, ale bryły i detale są rekonstrukcjami
**inspirowanymi zdjęciami, nie fotogrametrią 1:1**. Podziały szyb i
wymiary nie są geodezyjnie poświadczone.

### Źródła referencji
- [Geoportal — NMT](https://www.geoportal.gov.pl/pl/dane/numeryczny-model-terenu-nmt/)
- [GUGiK — WCS](https://www.geoportal.gov.pl/pl/usluga/uslugi-pobierania-wcs/)
- [Restauracja Kuflonka — Gronie Ski & Bike](https://www.gronieszczyrk.pl/strefa-kulinarna/restauracja-kuflonka)
- [Kuflonka — Śląskie Travel](https://www.slaskie.travel/gastronomy/1019933/kuflonka)
- [Fotografia: górna stacja A1 — Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Szczyrk_Mountain_Resort_-_upper_station_of_gondola_lift_A1.jpg)
- [Operator — lokalizacja obiektów](https://www.szczyrkowski.pl/info/powierzchnie-reklamowe)
- Oryginalne dane OpenStreetMap/OSM © contributors ODbL; OpenSkiMap/OpenSkiData.

## Potwierdzony import GUGiK — 11 listopada 2026

Oficjalna usługa WCS zwróciła poprawne rastry dla wszystkich trzech sektorów; każda
siatka ma 100% pokrycia zweryfikowanego w imporcie.

| Sektor | Punkty siatki gry | Siatka m | Dostosowanie wysokości |
| --- | ---: | ---: | ---: |
| Hala / Solisko | 71 500 | 7,99 | +5,237 m |
| Golgota | 53 743 | 7,99 | +8,411 m |
| Skrzyczne | 164 710 | 7,99 | +3,843 m |

**Łącznie: 289 953 rzeczywiste próbki wysokości na siatce renderowania.**
Współrzędne źródłowe przyjęto EPSG:2180 i źródłowy model wysokościowy
PL-KRON86-NH, po dostosowaniu do umownej wysokości bazowej gry.
Dokładniejsza siatka zwiększa szczegółowość zboczy, ale nie zastępuje
pełnej fotogrametrii ani bezpośredniego renderowania każdego piksela NMT 1 m.

## Weryfikacja
`node v17/terrain.test.cjs` weryfikuje dekoder i pochodzenie danych.
GitHub Actions pobiera i weryfikuje **prawdziwy** raster WCS. Następny
workflow sprawdza trzy sektory, 2 przyciski mobilne, skok, 360,
powierzchnię NMT, bryły obiektów i zapisuje zrzuty WebGL2.

Zmiany do starej gry, `/v14/`, `/v15/`, `/v16/` nie są wprowadzane.
Zatwierdzona wersja po scaleniu: `https://pchojnowsky-stack.github.io/smr-pixel-ski/v17/`.
