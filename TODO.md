# Tasks

Only this repository is in scope. Deletion and publication require confirmation.

## Before merging

- [ ] Review the calibration handoff fix and documentation in a PR; keep `.DS_Store` and generated `www/` out of the diff.
- [ ] Reconcile the bundled Chinese font and its recorded size and hash against the intended asset, then rerun the offline integrity test.

## Technical debt

- [ ] Review compatibility Blink settings, retained personal eye references and old test/comment names; distinguish active inputs from unused compatibility data.
- [ ] Review camera-game initialization failure cleanup and stale generated files from the overwrite-only build.

## Verification

- [ ] With a real camera, finish the relaxed sample and confirm the food trial opens without switching language. Verify trial pass, retry and skip.

- [ ] Test real players: ordinary blinks, partly open eyes, different eye shapes, glasses, pose and lighting. Record ratios, duration and false triggers without assuming accuracy.
- [ ] Exercise the final camera flow: calibration, Skip, Play Again, New Player, Debug/game agreement and saved settings.
- [ ] Verify Windows launcher, Electron, Android WebView and result-card downloads on their actual platforms.
