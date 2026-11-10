# SMR Pixel Ski — proces agentów etapowych (aktualizacja 0.6)

## Działająca wersja i bezpieczne środowiska
- `/` – dotychczasowa produkcyjna 0.4.2, nie nadpisuj bez akceptacji.
- `/v05/` – fundament Babylon.js 0.5.
- `/v06/` – prace graficzne 0.6, śnieg i las.
- `/v07/`, `/v08/`, `/v09/` – przygotuj dopiero jako niezależne sceny kolejnych etapów.
- Za każdym razem testuj i publikuj przez GitHub Pages, nie wymuszaj Railway.

## Agenci GitHub Copilot (profile, nie uruchomione instancje)
- `.github/agents/06-snow-forest.agent.md` – Snow Forest Artist (0.6).
- `.github/agents/07-skier-motion.agent.md` – Skier Motion Artist (0.7).
- `.github/agents/08-resort-infrastructure.agent.md` – Resort Architect (0.8).
- `.github/agents/09-performance-map.agent.md` – Performance Cartographer (0.9).

Agent uruchamiany przez GitHub Copilot Coding Agent dopiero po wybraniu/ przypisaniu go w zgłoszeniu (o ile konto ma funkcję aktywną). Plik `.agent.md` nie jest autonomicznym procesem i nie uruchamia płatnych zadań samoczynnie. Każdy agent otrzymuje odrębny issue. Programowanie może również wykonać ChatGPT przez istniejący konektor GitHub.

## Kryteria
1. Każdy etap musi mieć screenshot rzeczywiście wyrenderowany w grze w 1280×720 i 390×844, a nie obraz AI.
2. Każdy etap musi zaliczyć sprawdzenie składni, weryfikację WebGL i dotykowego sterowania.
3. Raportuj liczbę obiektów, wydajność orientacyjną w CI i rzeczywistą na Androidzie, jeśli dostępna. Nie obiecuj FPS bez pomiaru.
4. Najpierw osobna gałąź i PR, potem zgoda na scalenie. Na `main` testowane poprawki.
5. Nie dodawaj cudzych modeli bez jawnej licencji.
6. Minimalizuj koszty: jeden zakres/agent, bez wzajemnego nadpisywania plików, odseparowane sceny i pipeline graficzny tylko przy zmianach.
