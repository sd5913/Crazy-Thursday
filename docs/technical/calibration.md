# Baseline and player calibration

## Separate parameter ownership

- **Developer baseline:** weights, thresholds, eye-ratio limit and eye-hold duration. Debug edits preview first; Save developer baseline applies and persists to the current browser origin.
- **Player profile:** neutral offsets, target amplitudes, bounded gains, quality statistics and eye reference samples. Memory only, tied to the baseline signature; refresh or baseline change invalidates it.
- `face-settings.js` owns composition. Player calibration never overwrites baseline settings. Saving a baseline does not skip calibration on camera-game startup.

## Shared five-step workflow

`face-calibration.js` supplies one state machine to both game and Debug: neutral, smile, refusal, mouth-opening gesture for VOMIT, eyes closed.

- Each step samples for 1.5 seconds; ignores the first 250ms.
- The game illustration has a clockwise progress outline starting at 12 o’clock. Its progress derives from the sampler’s remaining time, not an independent animation clock; retry/next step resets it.
- At least 12 valid fresh observations spanning 800ms are required.
- Neutral uses median; target actions use P75, rather than a single maximum.
- Insufficient samples or insufficient separation from relaxed noise require retry.
- Amplitude gain is bounded to 0.75–1.25 (±25%). Offset subtraction and developer weighting are separate, so final output is not bounded to ±25% change.
- Five steps must complete before replacing the profile. Cancel retains previous compatible settings; game Skip explicitly uses baseline only.

## Final eye behavior

Eyes are checked using raw per-eye ratios and duration, not Blink/Squint blendshapes. Calibration still samples and validates open/closed geometry, but the stored personal eye references do not currently alter the raw-ratio threshold. This remaining data should not be presented as active personal eye normalization.

## Persistence and assets

- Storage key: `expression-feeding.face-settings.v1`; storage failure leaves in-page application available with an explicit warning.
- Specific old defaults are migrated; other saved custom settings remain authoritative. Check Debug before assuming source defaults are effective.
- Player profile is never persisted. Model frame data is not written to baseline storage.
- Calibration illustration paths belong to the shared step definitions. SVG placeholders in `src/assets/calibration/` can be replaced without changing game logic; a format/path change must update references.
