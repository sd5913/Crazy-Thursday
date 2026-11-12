# Crazy Thursday: Capacitor app

A camera-driven expression-feeding game with a local web preview, Capacitor Android wrapper and Electron desktop entry. Based on [sd5913/capacitor-app-template](https://github.com/sd5913/capacitor-app-template).
The app ID is `org.sd5913.crazythursday`.

## Current project documentation

- [Current status](CURRENT.md) · [Actionable work](TODO.md)
- [Technical and gameplay documentation](docs/README.md)
- [Team development log](LOG.md)

The runtime documentation above supersedes older weekly implementation notes.

## Run and change

### One-click web preview (macOS / Windows)

Install Node 24 LTS, then double-click the launcher in `scripts/`:

- macOS: `scripts/start-mac.command`
- Windows: `scripts/start-win.bat`

The launcher builds `www/`, starts a local server, and opens
`http://localhost:8000/`. Keep its terminal window open; press Ctrl+C to stop.
The web preview needs only Node (no Python, Android SDK or `npm ci`). Do not
open the HTML with `file://`: browser modules and camera access need a local
HTTP origin. Camera mode requires permission and internet access to download
the MediaPipe model; **Demo** mode uses S / F / V / B without a camera.

If macOS reports a permission error, run `chmod +x scripts/start-mac.command`
from the repository root. If port 8000 is occupied, stop the existing server
or set `PORT` to another port. For terminal use, run `npm start`.

### Checks and Android dependencies

Install Node 24, then from the repository root:

```bash
npm ci
npm test
npm run build
```

Open `www/index.html` using a local web server, e.g. `python3 -m http.server 8000 --directory www --bind 0.0.0.0`, and click
**Start & Calibrate**. Change `src/logic.js` or the interface; rerun the checks. A
teammate can branch, commit, push and open a PR with a description and test
instructions. Actions uploads the `web` folder and an Android **debug APK**;
download an artifact from the run and test it. The APK is not a signed store
release.

## Publish a versioned release

When your team is ready to share a tested build, push a version tag:

```bash
git switch main
git pull origin main
git tag v1.0.0
git push origin v1.0.0
```

The tag must use `vMAJOR.MINOR.PATCH` (for example, `v1.0.0`). Actions runs the
web checks and Android build first; only if both pass does it create a GitHub
Release with `web.zip` and `android-debug.apk`. Find them under your repository's
**Releases**. The APK uses Android's debug signing key and is for testing, not
a Play Store release; use proper signing and store credentials for distribution.
Run the workflow manually to download a `release-preview` artifact without
publishing a release. A new release needs a new tag. Keep GitHub Actions enabled and allow the
workflow's `GITHUB_TOKEN` contents-write permission. A tag creates a public
release in a public repository; do not push one until you are ready to publish.

## Codex cloud environment

Connect GitHub, create a new task and choose **Work in → Cloud → Select
environment → Create environment**, then choose your new repository. Ask Codex
to run `.codex/setup.sh` with Node 24; review setup output and changes, save and
**Publish**. Start a new task: “Change the message after a second tap and run
the tests.” Review its diff, run the app, and ask a teammate to review the PR.
The setup script configures the coding workspace. GitHub Actions uses separate
fresh runners. See [Codex environments](https://learn.chatgpt.com/docs/environments/cloud-environments).

## Android and iOS

For Android install JDK 21 and Android SDK, set `ANDROID_HOME`, then:

```bash
npm run android:sync
cd android && ./gradlew assembleDebug
```

The APK is in `android/app/build/outputs/apk/debug/`. GitHub Actions prepares
its own Android runner and uploads it without store credentials. A Play release
needs its own signing and store setup. iOS requires a Mac, Xcode, an Apple
developer account for distribution and a separately added iOS platform; see
[Capacitor environment setup](https://capacitorjs.com/docs/getting-started/environment-setup).
Electron desktop packaging is a separate wrapper; see
[Tetrilaunch's desktop workflow](https://github.com/venetanji/tetrilaunch/blob/main/.github/workflows/desktop.yml).

## Optional: deploy the web build

Create a Cloudflare account and a scoped Workers deployment API token. Under
GitHub **Settings → Secrets and variables → Actions**, add repository secrets
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`, and a repository variable
`CLOUDFLARE_WORKER_NAME` with your unique Worker name. Create a GitHub
`production` environment if using environment protection. Run **Deploy web
(manual)** in Actions, then open the Worker URL in the log. No deployment runs
on pull requests. The Cloudflare account may have usage limits or costs.
Do not put real secrets in source, screenshots, prompts, or the browser bundle:
anything shipped to the client is visible to users. Other providers have their
own destination, tokens and commands.

## Project Management

[View the Crazy Thursday Team Project Board](https://github.com/orgs/sd5913/projects/12/views/1)

## Artwork and calibration assets

Runtime image slots live in `src/assets/` and are copied to `www/assets/` by the build.

| Slot | Current source |
| --- | --- |
| Background | `src/assets/bg.jpg` |
| Spoon | `src/assets/spoon.png` |
| HUD | `src/assets/hud.svg` |
| Speech bubble | `src/assets/hint.svg` |
| Eight food items | `src/assets/food/<id>.svg`, referenced from `src/logic.js` |
| Calibration illustrations | `src/assets/calibration/`, shared by game and Debug |

Replace an image at the same path without changing game logic. If the format or path changes, update the relevant image reference in `src/index.html`, `src/logic.js` or `src/face-calibration.js`. SVG, PNG, JPEG and WebP are browser-supported; SVG is not mandatory. Background images use cover sizing; calibration images preserve their aspect ratio.

`node scripts/gen-placeholders.mjs` regenerates placeholder assets and can overwrite artwork. Run it only deliberately, then rebuild with `npm run build`. See the [calibration artwork guide](src/assets/calibration/README.md).

## Team development history

The earlier README weekly notes mixed historical implementation details and proposed work. Their commit-backed milestones are now summarized in [LOG.md](LOG.md), including the preceding team iterations rather than only the current local changes. The original notes remain available in Git history, for example [the README at the committed baseline](https://github.com/sd5913/Crazy-Thursday/blob/6b78a23/README.md).

The committed history establishes the template, camera-feeding prototype, artwork, combo, sharing, desktop entry, responsive UI and replay before the current diagnostics iteration. The log identifies recorded commit authors without treating commit counts as contribution shares or exclusive ownership.

Sound effects and friend challenges appeared as mixed “added/planned” items in the earlier notes; they are not claimed here as verified runtime features. Current recognition behavior is specified in [expression inputs](docs/gameplay/expression-input.md), not by obsolete Blink, tongue, lip-press or Lidded descriptions from historical revisions.
