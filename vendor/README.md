# Bundled runtime resources

MediaPipe Tasks Vision 0.10.18 and the float16/1 Face Landmarker model are served from this app's own origin. There is no CDN fallback or runtime updater.

- `mediapipe/0.10.18/vision_bundle.mjs`: original ESM distribution.
- `mediapipe/0.10.18/wasm/`: SIMD and non-SIMD JS/WASM pairs; the resolver selects the supported pair.
- `mediapipe/face_landmarker.task`: original model (3,758,596 bytes).
- `mediapipe/LICENSE`: upstream Apache-2.0 license from the matching MediaPipe tag. Upstream project: https://github.com/google-ai-edge/mediapipe/tree/v0.10.18 . Model source: https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task .
- Fonts reside in `../assets/fonts/` with their respective SIL Open Font License notices. Files are unmodified Google Fonts distributions.
- `resources.json` records source URLs, exact bytes and SHA-256 for all bundled upstream files. URLs are provenance, not runtime requests.

The model, runtimes, fonts and notices total 23,476,835 bytes (about 22.39 MiB), before archive compression. Browser sessions load one WASM variant, not both.

To update, deliberately acquire matching runtime versions, preserve notices, replace the files and update the manifest. Run `npm test` and cold-start with external network blocked. Do not silently fall back to a CDN.

Local launcher and installed bundles can load these resources without internet. A hosted website still needs its origin reachable to obtain its files; no service-worker offline installation is implemented here. Initial npm/platform build dependency installation can still require internet.
