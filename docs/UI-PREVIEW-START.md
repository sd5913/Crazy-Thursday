# Pixel UI preview branch

This branch adds preview files and assets only. Existing game, face detection, rules, README, package configuration and launchers are unchanged from main at `d3810d0`.

## Try the screens

1. Use Node 24 and run `npm start` from the repository root.
2. Open `http://localhost:8000/ui-flow.html` for the nine screen layouts.
3. Open `http://localhost:8000/ui-preview.html` for the continuous keyboard UI demo.
4. The original game remains at `http://localhost:8000/`.

Use S to accept, F to refuse and V for recovery in the UI demo. Its optional camera window displays mouth/smile estimates; camera input does not control this demo. The new closed-eye defence on main has not been integrated into the UI study. Frozen layout routes use illustrative data, not saved gameplay. Camera hardware accuracy has not been verified.

## Assets and dialogue

- `src/assets/food-png/`: all 12 individual transparent PNGs, 768 x 768.
- `docs/food-dialogue.json`: filenames, English names, Chinese names, proposed edible category and nurse lines.
- `docs/food-assets-and-dialogue.md`: readable bilingual catalogue.
- `src/assets/fonts/`: bundled pixel fonts and their OFL licences.

The PNGs were extracted with AI editing; object details can differ from the reference sheet. The existing game's eight-item catalogue is unchanged. Three matching assets are shown in the UI demo; importing the full proposed catalogue is future integration work.

Do not merge this branch until the team has reviewed it. Building copies source into ignored `www/`; generated output is not committed.
