# SMR Pixel Ski – Etap 0.9: rzeczywiste dane terenu

**Wersja robocza danych. To NIE jest jeszcze zatwierdzona ani geodezyjnie dokładna wersja gry.**

### Wybrany odcinek
- Trasa 4 **Szumarjanka** (na oficjalnym PDF ośrodka z sezonu 2023 występuje również nazwa „Szmaragdowa”).
- Hala Skrzyczeńska (około 1000 m n.p.m.) → Solisko (około 655 m n.p.m.).
- Deklarowana długość 2014 m, przewyższenie 345 m, średni spadek około 17% (opis katalogowy, nie lokalne nachylenia).
- Nie należy zakładać stałej szerokości; granice trasy mają pochodzić z ortofotomapy/OSM, kiedy będą możliwe do weryfikacji.

### Dokąd zmierzamy
1. OSM: prawdziwe geometrie tras i wyciągów, poligony lasów oraz budynków. `python tools/fetch_szczyrk.py` zbiera dane do `v09/data/`; `quality-report.json` dokumentuje wyniki. Nie skleja automatycznie fragmentów tras.
2. DEM: początkowy globalny model wysokości Mapzen Terrain Tiles / Terrarium (zróżnicowana dokładność, NIE 1 metr). Docelowo zastępujemy go **NMT 1 m od GUGiK** w układzie wysokościowym PL-EVRF2007-NH.
3. Dopiero po kontroli kompletności śladu trasy: transformacja WGS84 do lokalnej siatki metrowej, triangulacja terenu, rzeczywisty przebieg krawędzi oraz odpowiednie rozmieszczenie lasu/zabudowań w scenie 3D.
4. Każda zmiana przechodzi walidację geometrii i osobny test renderowania. Starsze `/v08/` pozostaje dostępne.

### Instrukcja uruchomienia
```bash
python -m pip install pillow
python tools/fetch_szczyrk.py
```
Na GitHubie uruchom workflow `SMR 0.9 Geodata Intake`, a następnie pobierz jego artefakt. Workflow nie publikuje niezweryfikowanych danych jako rzeczywistych stoków.

### Źródła i licencje
- Oficjalna mapa ośrodka: https://www.szczyrkowski.pl/fileadmin/resort_upload/szczyrkowski/23_zima/B2B-Szczyrk_Mountain_Resort.pdf
- Długości i przewyższenia: https://www.skionline.pl/stacje/polska-beskid-izlezski-szczyrk-szczyrk-mountain-resort,osrodek,23,mapa-tras-narciarskich.html
- Geometrie: © OpenStreetMap contributors (ODbL 1.0), https://www.openstreetmap.org/copyright
- DEM globalny: Mapzen Terrain Tiles, https://registry.opendata.aws/terrain-tiles/ (sprawdź wymagane atrybucje datasetu)
- Docelowe NMT 1m: GUGiK https://www.geoportal.gov.pl/pl/dane/numeryczny-model-terenu-nmt/


## Grywalny podgląd 0.9 — geolokalizowane dane (weryfikacja WebGL)
Po zatwierdzeniu i scaleniu na GitHub Pages: https://pchojnowsky-stack.github.io/smr-pixel-ski/v09/

- Tor ruchu / oś stoku z **OSM way 202733799**, geometria w lokalnych metrach; długość polilinii **1686.4 m** przy katalogowej 2014 m — tej rozbieżności nie korygujemy fikcyjnie.
- Rzeczywisty obszar DEM **Mapzen Terrarium**, siatka 6812 wierzchołków; nie jest to jeszcze dokładny NMT GUGiK 1 m.
- **132 drzewa** próbkowane WYŁĄCZNIE wewnątrz rzeczywistych poligonów lasów OSM, a nie w rzeczywistych punktach każdego drzewa.
- **34 pobliskie budynki** w obrysie OSM, bryły i część wysokości uproszczone, **10 punktów** przebiegu kolejki B1 OSM.
- Pas trasy **38 m to szerokość POGLĄDOWA**, nie wynik pomiarów; nie wolno komunikować jej jako autentycznej szerokości.
- Dotykowe sterowanie lewo/prawo, zjazd, hamowanie, skok; uproszczony ruch po osi trasy.
- Zrzuty z faktycznego WebGL w 1280×720 i 390×844 oraz logi przez workflow `SMR 0.9 Geodata Playable Visual QA`.

**Stan realizmu:** geolokalizowane są przebieg, wzniesienia niskiej rozdzielczości oraz orientacyjne pokrycie terenu. Materiały, detale leśne, bryły budynków, pochylenia krótkich fragmentów i obrzeża stoku wymagają dalszego modelowania. Wersja jest **wczesną podglądową sceną GIS**, nie ukończoną trasą 1:1. W szczególności środek stoku w OSM nie jest gwarancją dokładnych krawędzi zjazdu.
