# SMR Pixel Ski 0.2 — Pixel 3D / Low Poly

Grywalny prototyp mobilnej gry narciarskiej. Wersja 0.2 to nowy renderer natywny WebGL 3D, bez zewnętrznych bibliotek.

## Graj na telefonie
https://pchojnowsky-stack.github.io/smr-pixel-ski/?v=0.2

## Co działa
- Kamera zjazdowa C: około 35° w dół za narciarzem
- Trójwymiarowy, proceduralny stok narciarski długości 1400 m
- Narciarz 3D, sterowanie dotykowe lewo/prawo i hamowanie
- Drzewa low-poly ze śniegiem, las, skały, groomerowe ślady na trasie
- Podpory gondoli, liny i animowane kabiny
- Kilka budynków ośrodka w stylu low-poly
- Gwiazdki, prędkość, postęp, pauza i ponowienie zjazdu

## Weryfikacja
Test syntaktyczny i test logiki uruchomienia przeszedł pomyślnie. Potwierdzono wdrożenie GitHub Pages statusem success. Rendering na fizycznym telefonie wymaga testu użytkownika.

## Zakres
To **stylizowana trasa inspirowana Szczyrkiem**, nie prawdziwy model topografii czy układ SMR. Materiały i modele są proceduralne. Nie ma jeszcze realistycznej fizyki, kolizji z drzewami, wsiadania na wyciągi ani pełnej mapy ośrodka.

## Aktualizacje
Po zmianach na gałęzi main workflow GitHub Actions publikuje nową wersję automatycznie.
