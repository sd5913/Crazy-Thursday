# Current status

Updated: 2026-11-19 (Hong Kong, UTC+8)

## Current implementation

- Eat by Face (看脸吃饭, formerly Expression Feeding) is the team project in `sd5913/Crazy-Thursday`. The calibration trial handoff uses the runtime food catalogue. The default eye defense requires both ratios to be at or below 0.1 for 200 ms; saved custom baselines still take precedence.
- MediaPipe Tasks Vision 0.10.18 runs single-face inference locally with bundled runtime, model and fonts.
- Game and Face Debug share recognition, baseline composition and five-step sampling. The camera game adds food trials after capture; same-player replay retains the session profile.
- The game UI and food copy support English and Simplified Chinese. The runtime food catalogue and build pipeline consume the authored food catalogue and PNGs under `food-assets/`.
- Game rules and result behavior are indexed in [project documentation](docs/README.md). Published milestones and attribution are in [the team log](LOG.md).

## Verification

- Latest check: web build and diff checks passed; 87 of 88 tests passed. The remaining test fails because the tracked Chinese font is 26,856 bytes but the integrity manifest records 26,400. The mismatch predates the local fix.
- The local handoff fix has not been retested with a real camera. See [open verification tasks](TODO.md).
