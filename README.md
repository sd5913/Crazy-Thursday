# Crazy Thursday: Capacitor app

A small interactive web app wrapped with Capacitor for Android. Based on [sd5913/capacitor-app-template](https://github.com/sd5913/capacitor-app-template).
The app ID is `org.sd5913.crazythursday`. A
button and counter are deliberately small enough to trace and change.

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
the MediaPipe model; **Demo** mode uses S / F / V without a camera.

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
**Send signal**. Change `src/logic.js` or the interface; rerun the checks. A
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

## 美术资源接入（表情喂食小游戏）

UI 里的背景、食物、状态栏、提示都是真正的 `<img>` 插槽，目前用带标注的 SVG
占位图填充，美术直接替换即可，**逻辑代码不用改**。

所有图片放在 `src/assets/`（构建时原样拷到 `www/assets/`）：

| 插槽 | 文件 | 在代码里的位置 |
| --- | --- | --- |
| 背景图 | `src/assets/bg.svg` | `src/index.html` 里的 `<img id="bg" src="assets/bg.svg">` |
| 状态栏 | `src/assets/hud.svg` | 顶层 HUD 背景，位于分数 / 难受值之后 |
| 提示气泡 | `src/assets/hint.svg` | 底部字幕背后的气泡 |
| 食物 ×8 | `src/assets/food/<id>.svg` | 每轮由 `src/logic.js` 的 `it.image = 'assets/food/${it.id}.svg'` 设定 |

### 怎么换图

- **最简单**：把同名文件覆盖掉（例如用 `bg.png` 替换 `bg.svg` 时，同时把
  `index.html` 里的 `src="assets/bg.svg"` 改成 `src="assets/bg.png"`）。
- **改路径**：食物图改 `src/logic.js` 底部那一行；背景/状态栏/提示改
  `src/index.html` 里对应的 `src` 属性。

### 背景图要换格式吗？

**不需要。** 现在用 SVG 只是因为占位图好生成、能写标注。浏览器原生支持
SVG / PNG / JPG / WebP 等任意常见格式，换成位图直接改 `src` 指向新文件即可，
没有“必须 SVG”的限制。尺寸建议 1920×1080 起步，CSS 用 `object-fit: cover`
自适应铺满。

### 重新生成占位图

```bash
node scripts/gen-placeholders.mjs   # 写 src/assets/* 占位图
npm run build                       # src/ -> www/（或手动把 src 拷到 www）
```
