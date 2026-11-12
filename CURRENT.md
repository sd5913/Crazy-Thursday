# Current status

Updated: 2026-11-13 (Hong Kong, UTC+8)

## Scope and baseline

- Expression Feeding is the team project in `sd5913/Crazy-Thursday`. Work is confined to this repository.
- Current main is based on `6b78a23`. The diagnostics/input changes and documentation below are uncommitted; no new release or tag has been published.
- The existing camera game, artwork integration, combo, share cards, desktop entry and replay flow predate this working-tree iteration. See [milestones](LOG.md) for commit-backed history.

## Current working tree

- MediaPipe Tasks Vision 0.10.18, single-face local inference; initial JS/WASM/model and font downloads require network access.
- Game and Debug share recognition, baseline composition and five-step calibration modules.
- Developer baseline persists in this browser; player offsets/gains are session-only. Amplitude gains are limited to 0.75–1.25, independently of offset subtraction.
- REFUSAL combines brow-down and mouth-corner-down signals; lip pressing is excluded. VOMIT uses jaw opening, not tongue detection.
- EYES CLOSED uses both raw eyelid ratios plus continuous duration; Blink/Squint are not decision inputs. Defaults 0.05 / 500ms remain subject to real-player tuning.
- Gameplay is English. Debug defaults to English, supports Chinese, and provides a unified decision table, Special States settings and grouped raw signals.
- Debug has a fixed camera/sidebar and independently scrolling content. Shared calibration placeholders live in `src/assets/calibration/`.
- Demo eye geometry now follows B rather than remaining permanently closed. Eye geometry is excluded from higher-is-stronger mouth rankings.

## Verification

- Latest executed checks: 46 Node tests passed; build and diff checks passed.
- Headless Chrome verified Demo neutral/S/F/V/B and release-to-neutral without page errors.
- Real-camera accuracy, final end-to-end calibration and platform delivery remain unverified. Test success is not a claim of improved population accuracy.
- [Technical documentation](docs/README.md) describes the current implementation; old weekly notes are historical evidence, not the current specification.

## Release

- File deletion, commit, tag and push still await the agreed release scope.
- Untracked `.DS_Store` requires an explicit inclusion/exclusion decision.
