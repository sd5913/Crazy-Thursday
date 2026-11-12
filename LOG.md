# Milestone log

## Evidence and attribution

This log was compiled on 2026-11-13 (Hong Kong, UTC+8) from this repository's Git history, changed files and existing weekly notes. Dates below use Hong Kong time (UTC+8). Entries reconstructed from commits are retrospective, not contemporaneous reports. Commit author names identify recorded authorship, not exclusive ownership, effort percentages or all design/art contributors. The uncommitted iteration is explicitly separated from established team work.

## 2026-10-29 — Repository and platform foundation

- `7d4a885` — **Dezhen Zhen**: initial repository README.
- `75be7b1` — **qiugeapple**: README/project link update.
- `3f58223` — **North Wilde**: initialized the Capacitor template, Android project, web source, tests, build/release/deployment workflows and environment setup.

## 2026-11-01–02 — First expression-feeding prototype

Recorded author: **dydropwp**.

- `0cfecf9`: added camera/MediaPipe integration, feeding orchestration, expression rules, UI and tests, alongside course example material.
- `beda1b7`: expanded the prototype and input/demo wiring, with tests and entry-page adjustments.
- `ee0a860` (`v1`, a commit subject): integrated food/background/HUD/spoon artwork, placeholder generation, feeding visuals, rules and styling. The camera-game foundation therefore predates the diagnostics iteration below.

## 2026-11-02 — Cross-platform web launch

- `9f40d66` — **FATQ**: Mac/Windows launchers, built-in Node preview server, working-directory-independent build and startup regression tests.
- `1d3530a` — **FATQ**: merged that work through PR #1. This is an integration milestone, not another independently implemented feature set.

## 2026-11-09 — Face gameplay, sharing and desktop support

Recorded author: **dydropwp**.

- `d3810d0` (`new face`): introduced eye-defense mechanics/calibration, expanded face/expression handling, failure snapshots and downloadable result cards; added the Electron entry and packaging configuration; removed several course-example files.
- `5f6013b` (`v1.2`, a commit subject): refined badges, calibration wording, fonts/placeholders, styles and CI/deployment configuration. Badge labels from this historical revision are not the current vocabulary.

## 2026-11-10 — Recognition, responsive UI and replay refinements

Recorded author: **dydropwp**.

- `2cd87ed`: changed recognition/frame handling, calibration and rules/tests, with substantial HUD/responsive layout work and launcher-test adjustments.
- `d8b2916`: further UI/type/layout and result-card refinements.
- `238c6e5`: added in-place same-player replay and a separate New Player recalibration path; refined result-card/game-over presentation.
- `6b78a23`: further UI/README adjustments, forming the committed baseline for the next local iteration.

## 2026-11-12–13 — Uncommitted diagnostics and input iteration

Status: local working-tree changes developed with AI assistance at the repository maintainer's direction. No commit attribution or release is claimed yet.

- Added Face Debug around the pre-existing camera game: camera/timing logs, unified decision/tuning table, Special States, grouped signals and English/Chinese presentation.
- Extracted shared calibration/analysis ownership and separated persistent developer baseline from session player correction; introduced replaceable calibration illustrations.
- Revised the existing input implementation after manual feedback: REFUSAL accepts brow/mouth-corner lowering without lip press; VOMIT remains jaw-driven; eye defense now uses raw per-eye geometry and duration rather than Blink/Squint gates.
- Fixed a regression introduced during this local eye-input iteration: Demo had been supplying permanently closed geometry. B now controls the simulated geometry. Removed obsolete Blink strength from diagnostic ranking.
- Added current-state, task and technical documentation without claiming the existing gameplay, artwork, sharing, desktop or replay systems as new work.
- Latest executed evidence: 46 Node tests passed, build/diff checks passed, and headless Chrome verified Demo neutral/S/F/V/B/release. Final real-camera and platform accuracy/delivery remain unverified.
- Superseded experiments include tongue-output assumptions, lip-press refusal and the Squint >0.6 gate. Retained personal eye-reference samples are not used to normalize the final raw-ratio gate; see the remaining work in [TODO.md](TODO.md).
- This file is the single team development log. No separate per-session development log is maintained; future milestones should extend this chronology with evidence and attribution.
