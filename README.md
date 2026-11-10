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
- **失败抓拍 + 战绩分享卡（已实现）**：`canvas` 在**判定失误瞬间**抓拍当前摄像头帧（镜像，贴合屏幕观感），叠加大号游戏名与数据块（得分 / 存活时长 / 被喂异物次数 / 最高连击），生成一张竖版「翻车现场」战绩卡；结束界面提供「保存战绩卡」按钮，**一键下载 PNG** 发朋友圈 / 抖音（Wordle 式分享飞轮，是社媒传播的核心引擎）。
- **闭眼防御机制（已实现）**：新增「闭眼」表情作为防御动作——玩家在勺子怼来时闭眼，直接挡掉这次喂食（不吃异物、不扣分，但**每次 +5 难受值**）。机制上：**闭眼防御会打断 combo（清零连击），但会像反应正确一样继续增加游戏速度（level 提升、节奏加快）**，用「保命但失去连击 + 更快更难 + 缓慢累积不适」的取舍增加策略深度，避免一直闭眼就能无限续命。判定改进：每个表情**只依赖自己的专属特征点**（闭眼只看 `eyeBlinkLeft/Right`，微笑 / 撇嘴只看各自嘴角，催吐以 `jawOpen` 为主、`tongueOut` 仅作降低门槛的加分项），左右两侧取**平均值**以容忍光照 / 侧脸造成的不对称；闭眼判定**优先于所有嘴部信号**，所以边说话、边笑、边撇嘴地闭眼都能正常防御（只有「张嘴 + 吐舌」的真催吐可覆盖闭眼，以保住 rescue 手势）。阈值取校准峰值的 0.7 倍并设较低地板，避免日常力度的表情被判成 RELAX。此外要求**连续闭眼 ≥ 150ms** 才算防御，避免自然眨眼误触发；校准新增第 5 步「Lidded」按玩家眼型定阈值；检测端改为挑选画面中**最大的人脸**，避免旁人入画被误识别。演示/测试模式新增 <kbd>B</kbd> 键触发闭眼防御（按住即时生效，无需保持）。
- **撇嘴（FROWN）识别修复**：`mouthFrownLeft/Right` 是 MediaPipe 里最弱的一组 blendshape（明显撇嘴常只有 0.1~0.3），而很多人中性脸的 `mouthSmile*` 有 0.1~0.2 的固定偏置，旧的「frown 必须比 smile 高 0.05」几乎把撇嘴全吃掉。现在改用共享的 `frownScore()` 复合信号（嘴角下拉为主，`mouthPress*` 抿嘴按 0.5 折算作备用通道），校准与判定用同一函数；阈值改为「中性基线 + 0.04、地板 0.09、校准峰值 0.5 倍且封顶 0.22」；判定不再要求压过 smile，只要求「没有明确在微笑」，真微笑仍由更高优先级返回。校准第 3 步提示同步改为「嘴角下拉或抿紧嘴唇」。
- **角落 HUD 重排与多尺寸适配**：顶部状态栏改成三列 grid（SCORE 左 / 标题中 / DISCOMFORT 右），`DISCOMFORT` 标签与进度条整体下移、进度条宽度改为 `clamp(120px, 30vw, 320px)`，不再压在刘海 / 状态栏装饰上；底部把表情徽章、台词气泡、combo 收进同一个 `.bottom-hud` 容器，宽屏三列 grid 让徽章在左、气泡居中且互不侵占，窄屏 / 矮窗口改为上下堆叠或单行紧凑布局，从根上消除原来「左下表情」与「中下台词」绝对定位重叠。统一 `--hud-gutter` / `--hud-bottom` / `--hud-top` 间距变量并接入 `env(safe-area-inset-*)`（viewport 加 `viewport-fit=cover`），开始面板与战绩卡在矮窗口可滚动、字号随视口缩放；combo 改为相对气泡定位，保持右上角倾斜 10° 的观感。
- **闭眼防御代价**：每次防御由 `discomfortDelta: 0` 改为 `SCORING.DEFEND_DISCOMFORT = 5`（不吃异物、不扣分，但一直闭眼也会累积到 Game Over），`game.js` 仍按 `MAX_DISCOMFORT` 夹取；测试与说明同步更新。
- **顶部栏字号统一与标题居中**：修正标题在 `auto 1fr auto` 中间列内居中、因左右列不等宽而偏移的问题——标题改为相对整条状态栏 `left:50% / translateX(-50%)` 绝对居中；引入共享 `--ui-title` / `--ui-side`，顶部标题与左下徽章主行同字号、SCORE / DISCOMFORT 小一档，整体较之前放大；`DISCOMFORT` 进度条宽度随视口收缩，≤760px 时标题拆成 Expression / Feeding 两行，与 SCORE / DISCOMFORT **同一行垂直居中对齐**（`1fr auto 1fr` 三列保证标题居中，取消不适条的 margin-top），顶部栏高度只由两行标题决定，不再有上下分行造成的空档；极窄屏另有轻微字号收紧以保证三者不互相挤占，避免放大后的标题撞上右侧读数。左下表情徽章改为固定宽度 `clamp(11.5rem, 38vw, 15.5rem)` 且文字居中，不再随 `NO FACE / not detected` 与 `GAG / vomiting` 等状态忽宽忽窄；宽屏三列布局断点相应提高到 1080px，给固定宽度徽章留出左侧列空间。
- **窄屏字号上调**：`--ui-side` 下限由 1.1rem 提到 1.35rem（SCORE / DISCOMFORT 及徽章副行放大），≤600px 台词字号由 `clamp(1rem, 4.6vw, 1.6rem)` 提到 `clamp(1.35rem, 5.6vw, 1.85rem)` 并收紧行高，矮屏台词下限由 .95rem 提到 1.2rem；窄屏标题按视口缩放到 `clamp(.8rem, 3.4vw, 1.15rem)`，320px 宽也放得下。
- **SCORE 与窄屏台词再放大**：`SCORE` 单独用 `clamp(1.6rem, 2.4vw, 1.9rem)`（窄屏约 25.6px、宽屏约 30.4px），DISCOMFORT 保持侧栏字号以免挤占中间标题；≤420px 时 SCORE 回落到 1.25rem 保证三者仍能同行。≤600px 台词由 `clamp(1.35rem, 5.6vw, 1.85rem)` 提到 `clamp(1.6rem, 6.4vw, 2.1rem)`（492px 视口约 27.6px → 31.5px），台词气泡比例同步由 640/120 调到 640/140；矮屏恢复 640/120，避免放大后的长台词溢出气泡。超长的键盘 Demo 开场提示另由 `setSubtitle()` 在文本超过 44 字时加 `.long` class 自动降一档字号，短台词不受影响。
- **窄屏台词字号修正（长文本 / 矮屏覆盖）**：之前 `.subtitle.long` 的选择器特异性高于各断点里的 `.subtitle`，所以窄屏放大对超长提示完全无效（仍是约 15px），而 `max-height:480px` 又会把普通台词压回小字号。现在每个断点都用同等特异性的 `.subtitle.long` 一起放大：≤600px 普通台词 `clamp(1.95rem, 7.4vw, 2.45rem)`、长台词 `clamp(1.4rem, 4.6vw, 1.8rem)`，气泡比例 640/190；矮屏普通台词 `clamp(1.5rem, 5vh, 2rem)`、长台词 `clamp(1.3rem, 4vh, 1.65rem)`，气泡 640/155；桌面长台词下限由 .95rem 提到 1.15rem；「窄 + 矮」组合的气泡比例单独放宽到 640/220，竖屏 ≤600px 再给气泡 `min-height: 118px`，保证 320–390px 手机上放大后的三行短台词也装得下。修改后用无头 Edge 在 320/360/390/492/716/1256 等宽度以及矮屏、横屏窗口复测短台词与长提示的字号和溢出情况。
- **两行标题后不再缩短 DISCOMFORT 条**：标题在 ≤760px 折成 Expression / Feeding 两行后，顶部栏高度已由标题决定，进度条不必再为省空间而变短。删掉 ≤760px 的 `clamp(80px, 18vw, 200px)` 与 ≤420px 的 `72px` 两条覆盖，进度条统一回到基础 `clamp(110px, 22vw, 280px)`，仅靠 `max-width: 100%` 随右侧 grid 列自适应；极窄屏只继续收紧标题与左右读数的字号。
- **结算卡去掉恒定字段**：Game Over 的唯一触发条件是 `discomfort >= MAX_DISCOMFORT (100)`，而所有增减都被夹取在 0–100，因此分享卡上的 `FINAL DISCOMFORT` 永远是 `100 / 100`，是常数而非战绩。统计行由 5 行减为 4 行，并删掉 `gameOver()` 传给 `buildResultCard()` 的 `discomfort` 字段；顶部 HUD 的 DISCOMFORT 条保留，游戏过程中照常显示。
- **Play Again 不再重新扫脸 + 分享卡文案**：分享卡底部 `Share your feeding fail!` 改为 `Share your feeding!`。原先 `againBtn` 直接 `location.reload()`，每次都要重新申请摄像头、加载模型并重做 5 步校准；但校准只是给当前玩家的表情幅度建立阈值，同一个人连玩完全可复用。新增 `resetRun()` / `restartGame(recalibrate)`：Play Again 判断已有 `state.thresholds` 就原地重置对局状态（分数 / 难受值 / 回合 / 连击 / 翻车抓拍等）、隐藏遮罩并重开一轮，摄像头流、MediaPipe 模型和个人阈值全部保留；结算界面另加「New Player」按钮（仅摄像头模式，键盘 Demo 无需校准故不显示）走 `calibrate()` 分支，供换人或光照 / 镜头变化时重新采样。`loop` 在 `gameover` 时不再继续调度 rAF，保证重开后只有一条状态机循环。
- **结算界面排版与字号统一放大**：Game Over 按钮改为两行——上排 `Play Again` + `New Player`（键盘 Demo 只有前者），长文本的 `Save Result Card` 独占下排；`showOverlay()` 新增变体 class，仅给结算面板加 `.gameover-panel`，标题放大到 `clamp(2.6rem, 9vw, 4.4rem)`、按钮放大到 `clamp(1.35rem, 4.4vw, 1.85rem)`，开始 / 校准面板字号保持不变。分享卡 canvas 内文字同步放大（标题 34→42px、副标题 40→46px、统计行 40→50px、底部 28→34px）并重排行距，所有文字加 `fillText` 的 `maxWidth` 上限，避免字体回退或长数值时超宽 / 重叠；卡片显示宽度上限 340→380px，移动端仍按 `78vw` 自适应，桌面与手机上都更易读。
- **结算卡副标题、按钮留白与分享文案外移**：分享卡副标题拆成两行——第一行 `Feeding Results`，第二行是结果文案占位 `The Crush`，字号 46→58px；占位值由 `gameOver()` 以 `resultTitle` 传给 `buildResultCard()`，后续接入多种 result 只需替换该值，统计行随两行标题下移并重排行距。三个按钮的**文字字号不变**，只收紧黄色按钮框的内边距、不再让按钮拉伸占满列宽，并把行距 / 列间距加大，缓解放大后的拥挤感。`Share your feeding!` 从 canvas 移到卡片外、`Save Result Card` 下方的 HTML `.share-note`，字号放大到 `clamp(1.55rem, 4.6vw, 2.2rem)`；保存的 PNG 因此只包含画面与战绩，不再带上这一行。
