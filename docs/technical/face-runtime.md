# Recognition runtime

## Ownership and data flow

- `face.js`: camera acquisition, cached model initialization, actual inference and frame metadata. Model: MediaPipe Tasks Vision 0.10.18, single-face VIDEO mode, GPU delegate.
- `eye-geometry.js`: left/right eyelid ratio from existing landmarks. Distances use video pixel width/height; CSS mirroring is presentation only.
- `logic.js`: aggregate expression signals and ordered candidate checks.
- `face-settings.js`: baseline/profile composition and shared analysis used by game and Debug.
- `eye-hold.js`: continuous closure gate; cached render frames do not advance time. Open/no-face or >200ms interruption resets the hold.
- `game.js`: game loop, scoring, calibration presentation, replay and share card.
- `face-debug.js`: diagnostic session, same detection/analysis/calibration modules, event log and editable baseline.

Pipeline: camera frame → categories + eye geometry + freshness → shared analysis → eye duration protection → display/intent → gameplay.

## Frame semantics

- A skipped frame is not a fresh inference that found no face.
- Stale-video fallback inference is marked separately; repeated camera frames cannot count as calibration observations or sustain eye defense.
- Gameplay may reuse the last valid face briefly, with a 400ms face-loss window. This is distinct from eye-hold timing.
- Detection FPS counts real inferences, not animation callbacks. Logs are bounded; debug values refresh less frequently than rendering.

## Presentation and lifecycle

- Game UI stays English. Debug defaults to English on entry and can switch to Chinese without restarting inference or modifying settings.
- Debug uses an approximately 1:5 fixed camera/sidebar and independently scrolling content area. Special States owns eye-ratio/time controls.
- Debug back/error/cancel paths release camera tracks and stop callbacks, including late permission results.
- Same-player replay retains camera/model/profile; New Player reruns calibration.
- Top-three strength highlighting excludes eye geometry: lower-is-closed ratios are not comparable to higher-is-stronger mouth scores.

## Privacy and delivery

- Frames are processed locally; initial JS/WASM/model and fonts can require internet.
- Result cards capture frames in memory and may be downloaded as PNG at user request; local inference does not mean no face images are generated.
- `src/` is source; `www/` is generated. The current copy build overwrites but does not remove obsolete output files: review clean release outputs.
- Node 24 is recommended; package engines declares Node >=22. Web preview uses built-in Node modules; Electron/Android require additional platform dependencies.
- Camera-game initialization failure cleanup and real platform behavior remain verification tasks in `TODO.md`.
