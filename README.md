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

## 开发周报（Weekly log）

### Week 1（10-29 ~ 11-05）

本周围绕「表情喂食」小游戏（摄像头读表情、勺子怼脸、微笑吃 / 撇嘴拒）做了视觉与玩法打磨：

- **勺子 + 食物绑定放大**：新增 `src/assets/spoon.png`，食物落在勺兜内；整个「手 + 勺子 + 食物」以勺兜为锚点放大，喂食时从 2× 放大到 4×，勺兜始终钉在屏幕中心，运动缩放节奏不变。
- **提示气泡**：移除 `hint.svg` 里烘焙的 “HINT placeholder” 文字，只保留气泡框，台词由 `.subtitle` 叠在框中央。
- **状态栏标题**：`hud.svg` 占位文字改为游戏名 **Expression Feeding**，并改为 HTML 文字（`.game-title`）渲染，更清晰、字体可调。
- **整理场景元素**：删除顶部医生图标（`.nurse`）与底部病床图（`.patient`）， `.spoon .item` 的 `top` 调整到 `40%`，仍作为 `.spoon` 子元素，放大 / 位移时与勺子绑定运动。
- **全站像素风字体**：引入 Press Start 2P（标题 / 徽章）与 VT323（分数 / 难受值 / 字幕 / 面板），经 Google Fonts CDN 加载；占位图字体也改为等宽像素感，保证离线风格一致。
- **连击 Combo**：正确反应（好食物 + 微笑，或异物 + 撇嘴）累计 `combo`，失误或错失好食物清零；`combo ×N` 显示在底部台词气泡右上角、向右倾斜 10°，≥2 才出现，每次递增有弹跳动画。
- **渐显加速**：手与勺子透明度在喂食前 25% 进度内即从 0 升到不透明，之后保持满值（运动不变）。
- **回退对齐实验**：撤销了一轮「前景勺子贴合背景勺子」的微调，恢复居中放大版本。
- **平台适配检查**：核对 `scripts/start.mjs` 跨平台打开浏览器的分支（macOS `open` / Windows `rundll32` / Linux `xdg-open`），`node --test` 全部 10/10 通过。

美术资源仍为 `src/assets/` 下的占位图，可直接替换，逻辑代码无需改动。

### Week 2（2026-11-06 ~ 11-12）：爆点机制与玩法升级

围绕「社媒传播爆点」与玩法深度，新增 / 规划了以下能力：

- **音效**：加入吃东西、勺子怼脸节奏、连击弹跳、失败提示等音效反馈，强化“电子榨菜”式解压观感与短视频素材感（参考 Powerwash Simulator 的爽感传播）。
- **好友联机**：支持好友间联机 / 挑战——生成「专属喂养关」邀请链接，好友进入同一套随机序列，比谁先被异物（如洗洁精）送走；或同屏轮流（传手机）比存活时长。
- **失败抓拍 + 战绩分享卡（已实现）**：`canvas` 在**判定失误瞬间**抓拍当前摄像头帧（镜像，贴合屏幕观感），叠加大号游戏名与数据块（得分 / 存活时长 / 被喂异物次数 / 最高连击 / 最终难受度），生成一张竖版「翻车现场」战绩卡；结束界面提供「保存战绩卡」按钮，**一键下载 PNG** 发朋友圈 / 抖音（Wordle 式分享飞轮，是社媒传播的核心引擎）。
- **闭眼防御机制（已实现）**：新增「闭眼」表情作为防御动作——玩家在勺子怼来时闭眼，直接挡掉这次喂食（安全、不掉难受值、不吃异物）。机制上：**闭眼防御会打断 combo（清零连击），但会像反应正确一样继续增加游戏速度（level 提升、节奏加快）**，用「保命但失去连击 + 更快更难」的取舍增加策略深度。判定改进：每个表情**只依赖自己的专属特征点**（闭眼只看双眼 `eyeBlinkLeft/Right`，微笑 / 撇嘴只看同侧嘴角，催吐需张嘴 + 吐舌），并要求**双眼同时**达标以排除侧脸 / 单侧假信号；闭眼判定**优先于所有嘴部信号**，所以边说话、边笑、边撇嘴地闭眼都能正常防御。此外要求**连续闭眼 ≥ 150ms** 才算防御，避免自然眨眼误触发；校准新增第 5 步「Eyes shut」按玩家眼型定阈值；检测端改为挑选画面中**最大的人脸**，避免旁人入画被误识别。演示/测试模式新增 <kbd>B</kbd> 键触发闭眼防御（按住即时生效，无需保持）。
