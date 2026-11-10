# SMR Pixel Ski — 0.1

Pierwszy grywalny prototyp mobilnej gry narciarskiej inspirowanej Szczyrkiem.

## Uruchom
Po aktywacji GitHub Pages: https://pchojnowsky-stack.github.io/smr-pixel-ski/

## Sterowanie
Na ekranie: strzałki w lewo/prawo, hamuj, pauza. Telefon najlepiej trzymać poziomo.
Komputer: A/D lub strzałki, spacja hamuje.

## Zawartość
Jeden zjazd testowy około 1600 m, zbieranie gwiazdek, drzewa, infrastruktura inspirowana górskim ośrodkiem.
Kod działa w Babylon.js (WebGL, pobierany z CDN) z wariantem rezerwowym Canvas 2.5D.
Teren i ośrodek są fikcyjną stylizacją, nie dokładnym odwzorowaniem SMR.

## Publikowanie
Workflow .github/workflows/pages.yml jest przygotowany do publikowania z gałęzi main.
W Settings > Pages ustaw Build and deployment > Source > GitHub Actions.
Każda kolejna zmiana na main uruchomi aktualizację strony.
