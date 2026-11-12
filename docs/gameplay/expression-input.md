# Expression input contract

## States and precedence

`VOMIT → EYES CLOSED → SMILE → REFUSAL → NEUTRAL`; no valid face is displayed as `NO FACE`.

- **VOMIT:** jaw opening reaches its configured threshold. This is a game gesture, not medical detection of vomiting; no tongue signal is used. Rescue requires a new gesture edge.
- **EYES CLOSED:** each raw eyelid openness ratio is finite and at/below the configured limit, continuously for the configured protection time. Current defaults: 0.05 and 500ms. Neither Blink nor Squint is a decision input.
- **SMILE:** weighted smile reaches its threshold and is at least refusal + 0.05.
- **REFUSAL:** `max(mean(browDownLeft, browDownRight), mean(mouthFrownLeft, mouthFrownRight))`, followed by player correction and baseline weight. It must reach its threshold while smile stays below its threshold. Default refusal threshold: 0.05. Lip pressing is ignored.
- **NEUTRAL:** face detected but no higher action satisfies its full conditions; not an independent model confidence.

## Gameplay feedback

- Correct acceptance/refusal scores and accelerates the game; errors reset the combo.
- Closed-eye defense blocks feeding but adds discomfort, clears combo and increases speed; it is not unlimited free survival.
- Existing scoring constants and timings live in `src/logic.js`; this document does not duplicate the balancing table.

## Demo

S = smile, F = refusal, V = vomit, B = eyes closed; release = neutral. Demo simulates closed eye geometry only while B is held, and bypasses camera hold delay for keyboard responsiveness.

## Boundaries

- Both eyes must pass; invalid geometry cannot be interpreted as zero/opening success.
- Mouth actions keep their existing precedence; vomit can override eye closure.
- Raw ratio is not personal-normalized openness. The final ratio-only gate does not consume stored personal eye reference measurements.
