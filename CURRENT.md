# Current status

Updated: 2026-11-13 (Hong Kong, UTC+8)

## Scope and baseline

- Expression Feeding is the team project in `sd5913/Crazy-Thursday`. Work is confined to this repository.
- Main includes `7099486`, tagged `v1.3.0`: diagnostics/input changes and project documentation have been pushed. Offline resources, lip-press display cleanup and sampling progress feedback are subsequent uncommitted changes.
- The existing camera game, artwork integration, combo, share cards, desktop entry and replay flow predate this working-tree iteration. See [milestones](LOG.md) for commit-backed history.

## Current implementation

- MediaPipe Tasks Vision 0.10.18, single-face local inference; JS/WASM/model and fonts are now bundled locally; local runtime startup needs no internet.
- Game and Debug share recognition, baseline composition and five-step calibration modules.
- Developer baseline persists in this browser; player offsets/gains are session-only. Amplitude gains are limited to 0.75–1.25, independently of offset subtraction.
- REFUSAL combines brow-down and mouth-corner-down signals; lip pressing is excluded. VOMIT uses jaw opening, not tongue detection.
- EYES CLOSED uses both raw eyelid ratios plus continuous duration; Blink/Squint are not decision inputs. Defaults 0.05 / 500ms remain subject to real-player tuning.
- Gameplay is English. Debug defaults to English, supports Chinese, and provides a unified decision table, Special States settings and grouped raw signals.
- Debug has a fixed camera/sidebar and independently scrolling content. Shared calibration placeholders live in `src/assets/calibration/`.
- Demo eye geometry now follows B rather than remaining permanently closed. Eye geometry is excluded from higher-is-stronger mouth rankings.

## Verification

- Latest executed checks: 48 Node tests passed; build and diff checks passed.
- Headless Chrome verified Demo neutral/S/F/V/B and release-to-neutral without page errors.
- Real-camera accuracy, final end-to-end calibration and platform delivery remain unverified. Test success is not a claim of improved population accuracy.
- [Technical documentation](docs/README.md) describes the current implementation; old weekly notes are historical evidence, not the current specification.

## Release

- File deletion, commit, tag and push still await the agreed release scope.
- Untracked `.DS_Store` requires an explicit inclusion/exclusion decision.

## Offline resource update (2026-11-13 HKT)

- Vendored MediaPipe 0.10.18, model and fonts with licenses and SHA-256 manifest (22.39 MiB).
- 48 tests passed and build succeeded. Fresh Chrome context with all external requests blocked initialized the real model/WASM, loaded local fonts and started Debug inference and the camera game using a simulated camera. This verifies resource loading, not real-player accuracy.
- No desktop installer or Android-device offline execution was performed.

## Sampling feedback

- Game calibration shows a clockwise outline around the gesture illustration, starting at 12 o’clock and driven by the shared 1.5-second sampling duration. It resets on retry/next step.
- Browser verification covered intermediate progress and retry reset; this does not replace real-player calibration testing.
- If an already-running preview server predates the local `.mjs` MIME mapping, restart it before testing offline. Refresh alone cannot update server code.
