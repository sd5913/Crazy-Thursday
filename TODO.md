# Tasks

Only this repository is in scope. Deletion and publication require confirmation.

## Documentation and release

- [ ] Review the documentation/file list and confirm the main commit and annotated tag.
- [ ] Resolve the untracked `.DS_Store` inclusion/exclusion decision; fetch remote changes before publishing.
No repository-local `docs/temp/` exists; there are no temporary documents to delete in this release. The parent workspace is outside scope.

## Technical debt

- [ ] Review compatibility Blink settings, retained personal eye references and old test/comment names; distinguish active inputs from unused compatibility data.
- [ ] Review camera-game initialization failure cleanup and stale generated files from the overwrite-only build.

## Verification

Completed for the current update: 48 unit/integration tests, web build, external-network-blocked model/font startup, and browser sampling-ring progress/retry checks. These do not certify the platforms below.

- [ ] Test real players: ordinary blinks, partly open eyes, different eye shapes, glasses, pose and lighting. Record ratios, duration and false triggers without assuming accuracy.
- [ ] Exercise the final camera flow: calibration, Skip, Play Again, New Player, Debug/game agreement and saved settings.
- [ ] Verify Windows launcher, Electron, Android WebView and result-card downloads on their actual platforms.
