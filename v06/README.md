# SMR Pixel Ski — Etap 0.6: winter forest & snow
**Testuj wersję:** https://pchojnowsky-stack.github.io/smr-pixel-ski/v06/

## Co zmieniono w porównaniu z v05
- Gęstsze świerki o nieregularnych gałęziach i punktowo zalegającym śniegu: około 1150 losowanych instancji (w praktyce część poza granicą odrzucona).
- Spójniejsze kolory śniegu i łagodniejsze przejście stok/las.
- Jaśniejsze oświetlenie sceny, zmniejszona mgła.
- Kamera zwiększa pole widzenia w dół stoku; pozostaje wysoką kamerą śledzącą.
- Dynamiczna infrastruktura i tymczasowy narciarz pozostają z 0.5.

## Weryfikacja
Automatyczny workflow `SMR 0.6 visual QA` generuje zrzuty prawdziwej gry z Babylon.js w orientacji poziomej i pionowej. Testowane są również przyciski i działanie sceny. Wydajność na rzeczywistym Androidzie wymaga oddzielnego testu.

## Kolejne etapy
- 0.7 `SMR Skier Motion Artist` — narciarz i dynamika.
- 0.8 `SMR Resort Architect` — stacje, restauracje, kolejki.
- 0.9 `SMR Performance Cartographer` — mapa i optymalizacja.

Nie twierdzimy, że obecny model proceduralny odwzorowuje dokładnie teren SMR, ani że jakość renderowania jest już równa grafice koncepcyjnej C.
