# SMR Pixel Ski 1.8 — mapa lasów i budynków osadzona w OSM

**Cel:** wyeliminować błędne skupiska drzew i budynki ustawiane poza
właściwymi obrysami w poprzednich scenach. Warstwa wysokościowa GUGiK 1.7
pozostaje nienaruszona.

## Przyczyny starego błędu
1. `v17/piste.js` generował *nowe, niezweryfikowane* drzewa 32–99 m po
   obu stronach osi tras, niezależnie od mapy pokrycia lasem.
2. Stary generator `v14` ograniczał drzewa do limitu zależnego od
   kolejności poligonów i uzupełniał brak sztucznym lasem.
3. Listę budynków cięto do 95 obiektów w kolejności API zamiast wybrać
   te najbliżej tras i infrastruktury.
4. Restaurację Kuflonka przypisano do niepotwierdzonego obrysu OSM
   `way/657912056`; takie przypisanie zostało usunięte.
5. Część stacji tworzyła duże bryły w punktach osi wyciągów bez
   sprawdzenia obrysu budynków. Niezweryfikowane bryły usunięto.

## Nowe dane
`tools/build_smr18_osm.py` pobiera pełne OSM geometrie poprzez
Overpass API bez kopiowania cudzych zdjęć lub modeli. Źródła:
`natural=wood`, `landuse=forest` i `building=*`; dla lasów
obsługiwane także multipoligony i wewnętrzne dziury.

- Drzewa mają pozycje generowane w obrębie *rzeczywistych
  obrysów OSM*. Ich indywidualne pnie są proceduralnie rozmieszczonymi
  punktami w lasach, nie pomiarami konkretnych drzew.
- Próby umieszczenia drzew na trasach (bufor 31 m osi), wzdłuż
  kolei (9 m), przy stacjach (28 m) i wokół budynków (9 m)
  są odrzucane. Bufory są **przybliżonymi strefami wyłączenia**, nie
  oficjalnymi granicami stoków.
- Ziarno losowe jest deterministyczne; próbki powstają równomiernie
  na siatce 23 m *na całej mapie*, a nie w kolejności źródłowych
  poligonów. Maksymalny budżet: 2100 drzew na sektor.
- Budynki zachowują autentyczne obrysy OSM; są priorytetyzowane
  według odległości od tras i wyciągów. Maksymalnie 350 brył w
  sektorze (LOD). Wysokość budynku jest szacowana, jeśli brak
  atrybutu `height` lub `building:levels`.
- Ściany brył schodzą do lokalnej wysokości terenu, dzięki czemu
  domy na zboczach nie wiszą nad stokiem.
- Kuflonka jako osobny model jest rysowana tylko wtedy, gdy
  OSM *jednoznacznie identyfikuje nazwą* obrys budynku.
  Bez tej identyfikacji miejsce pozostaje nieoznaczone — zamiast
  pokazywać błędny budynek.

Źródło danych: © OpenStreetMap contributors (ODbL).
Położenie obrysów zależy od jakości mapowania społeczności OSM,
nie jest pomiarem geodezyjnym 1:1.
Wysokości: GUGiK NMT, siatka gry ~8 m, zgodnie z v17.

## Weryfikacja
Dane: `v18/data/osm-manifest.json` oraz
`v18/data/hala.json`, `golgota.json`, `skrzyczne.json`.
Skrypt odrzuca pobranie, które nie zawiera lasów lub budynków i nigdy
nie przełącza się bez ostrzeżenia na fikcyjny las.
CI: dane OSM dla wszystkich 3 sektorów, WebGL2 i prawdziwe kliknięcia
ekranu mobilnego, testy jazdy i prawdziwe screenshoty.

Po scaleniu: https://pchojnowsky-stack.github.io/smr-pixel-ski/v18/
Stare działające wersje /v17 i wcześniejsze są chronione.
