# Calibration placeholder artwork

The game calibration, Debug calibration and state guide share these SVG placeholders.

| File | Content |
| --- | --- |
| neutral.svg | Neutral face |
| smile.svg | Smile |
| frown.svg | Refusal: lowered brows or mouth corners |
| jaw.svg | Mouth-opening gesture for VOMIT |
| blink.svg | Eyes closed |
| none.svg | No face, used in the state guide |

Replace an SVG at the same path without changing code. For PNG/WebP replacements, update the image paths in `src/face-calibration.js` and the guide in `src/index.html`. Use a square canvas, centered subject and preferably a transparent background; the UI preserves aspect ratio.
