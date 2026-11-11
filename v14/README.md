# SMR Pixel Ski 1.4 — Rozbudowa ośrodka narciarskiego

Nowe grywalne sektory w **własnym SnowEngine WebGL2**, oparte na oryginalnych geometriach tras i wyciągów OpenSkiMap/OpenSkiData. Użytkownik wybiera sektor i trasę startową na smartfonie. Zmiana sektora przeładowuje lokalną mapę; brak fałszywej obietnicy płynnego, fizycznego połączenia wszystkich terenów.

## Dostępne sektory (dane źródłowe pobrane i zapisane)
- **Hala Skrzyczeńska / Solisko** — 5 tras (Szumarjanka 4, Malinowa 7, Bieńkula 5, Szczyrkowska II 3, Sportowa 1), wyciągi B1 i A1.
- **Golgota / Salmopol** — 3 trasy (Salmopolska 10, Golgota 11, Suche 4A), wyciąg B2.
- **Małe Skrzyczne / Kaskada** — 8 tras (Ondraszek 21, Kaskada 22a, Kaskada 22b, FIS 23, Widokowa 25, Kopa 3a, Szczyrkowska I 3b, Zbójnicka 3c), wyciągi B3, B4, B6 i C10.

**Razem: 16 osobnych obiektów tras i 7 wyciągów w trzech scenach.** Nie jest to deklaracja liczby wszystkich tras oficjalnie działającego ośrodka.

Każdy sektor ma własną siatkę terenu z danych globalnego DEM Mapzen Terrarium, dopasowaną w pobliżu osi tras do wysokości OpenSkiMap. Rozmieszczenie lasu oraz zabudowy oparto na poligonach OSM z poprzedniego ekstraktu, a liczba drzew jest zmniejszana na telefonie. Stacje wyciągów i oznaczenia tras są tylko uproszczoną grafiką ilustracyjną, nie modelami geodezyjnymi.

## UX telefonu
Cztery przyciski: LEWO, PRAWO, GAZ, SKOK; tricki 360 nadal działają. W menu wybieramy sektor, potem trasę; **TRASY** otwiera menu bez wychodzenia z gry. Kamera lotnicza i zoom zachowane.

## Dokładność / otwarte punkty
- OpenSkiMap to w znacznej mierze geometrie OSM. Nie mamy zweryfikowanych wielokątów szerokości tras — groomed corridor jest wizualizacją.
- Teren Mapzen z12 nie jest precyzyjnym NMT 1m GUGiK. Poza osią poszczególnych tras dokładność spadku jest ograniczona.
- Atrybucja: © OpenStreetMap contributors (ODbL), OpenSkiMap/OpenSkiData, Mapzen terrain tiles.
- Sektory nie są jeszcze jedną ciągłą przestrzenią: następnym etapem będą LOD/streaming terenu, połączona nawigacja między sektorami i rzeczywista ortofotomapa.

## Weryfikacja
`python tools/validate_expanded_resort.py` sprawdza kształt danych, a GitHub Actions otwiera trzy sektory w prawdziwym WebGL2 na wirtualnym telefonie, testuje skręty, skok, trick, HUD i menu.

Preview po scaleniu: https://pchojnowsky-stack.github.io/smr-pixel-ski/v14/
Poprzednie wersje pozostają osobno dostępne.
