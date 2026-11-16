# 表情喂食 · 游戏机制规则 / Expression Feeding — Game Rules

本文件记录当前版本的完整机制，中英文对照。UI 右上角「中 / EN」可随时切换全站语言。
This document records the mechanics of the current build, in Chinese and English. The `中 / EN` button in the top-right of the start panel switches the whole game.

---

## 一、中文规则

### 操作与判定

- 摄像头模式：微笑=接受；皱眉或压低眉毛=拒绝；闭眼并保持≈0.5 秒=防御；张大嘴=催吐。
- 键盘演示（无摄像头）：`S` 微笑，`F` 拒绝，`V` 催吐，`B` 闭眼；松开按键恢复放松。演示模式不需要校准。
- 每轮勺子到达时按当时的表情判定：
  - 微笑：正常食物 +10 分；超现实食物 +30 分、不适 +5；不可食物（异物）被吃下，不适 +10。
  - 拒绝：异物 +10 分；正常/超现实食物不加分、不加不适。
  - 防御（闭眼）：不适 +5，不得分，连击中断，但会加速游戏。
  - 无表情：正常食物被拒（无代价）；异物被强行喂下 +10 不适；超现实食物被拒（无代价）。
  - 无人脸检测按无表情处理。
- 错吃后有 2.5 秒催吐窗口：张嘴催吐成功，不适 −5（净 +5）；超时未吐，不适再 +10（净 +20）。不适始终限制在 0–100。

### 连击

- 正确接受、正确拒绝、接受/拒绝超现实食物会延续连击；无表情、防御、错吃会清零。
- 每次连击数上升，额外获得与「上升后的连击数」相等的分数（第一连 +1，第二连 +2……）。
- 连击加分计入总分，但不计入「进食得分」（大胃王判定只算真正吃进去的分数）。

### 结算判定（从上到下，命中即停止）

| 优先级 | 结果 | 达成条件 | 卡片照片 |
|---|---|---|---|
| 1 | 你惊动了V̷̛̪̲̓r̶̢̛̙̎̈́'q̸̨̛̳̊̈́h̷̢̛̹̿l̴̛̫̓̚-Ư̸̢̰̄̈́l̷̛̬̓͋g̸̨̛̞̈́t̷̛̪̓ḧ̶̛͓́ | 连续 6 轮闭眼防御或无脸（可混合），触发后进入无敌模式 | `bg-V̷….jpg` |
| 2 | 大胃王 | 总分 > 500，且进食得分占总分的比例 > 50% | `aha.jpg` |
| 3 | 植物人 | 全程没有任何表情反应（闭眼也算表情） | 失败抓拍 |
| 4 | 变相怪杰 | 本局最高连击 ≥ 20 | `TheMask.jpg` |
| 5 | 我还能吃… | 超现实食物造成的不适 > 结算时不适的 70% | 失败抓拍 |
| 6 | 火眼金睛 | 拒绝的异物 > 所端异物的 70%，且至少端出 3 件异物 | 失败抓拍 |
| 7 | 异食癖 | 异物造成的不适 > 结算时不适的 70% | 失败抓拍 |
| 8 | 留院观察 | 以上均不满足（兜底） | 失败抓拍 |

- 「异物」包括 `foreign_object` 与 `lookalike`（共 57 种不可食物）。
- 不适分桶按**实际生效**的增减计入（封顶丢弃的部分不计），催吐的 −5/+10 归回该异物所属类别；百分比分母是结算时的不适值（无敌模式结算时可能不足 100）。比例一律「严格大于」。
- 每种结果在卡片上方的标题下都有一行达成说明；结算界面切换语言会同步重绘标题、说明与结果卡。

### 惊动古神 · 无敌模式

- 连续 6 轮「闭眼防御」或「无脸」（可混合）即触发，游戏**不会**立即结束。
- 触发后：得分变为并锁定在 `-2147483647`；不适度条涨到 300% 并突破屏幕；背景换成侵蚀照片；上菜速度升至最快档的两倍（约 600ms 一轮）；台词固定为 `NONONONONONONO WHY DON'T YOU LOOK AT MEEEEEEE`。
- 表情徽章继续显示检测到的表情，但本局剩下的回合里不再影响得分、不适、催吐与判定。
- 首次检测到玩家脱离闭眼/无脸状态（有脸且不是闭眼）后 5 秒，游戏自动结算，结果固定为惊动古神；期间重新闭眼也不会取消倒计时。

---

## 二、English Rules

### Controls & judgement

- Camera mode: smile = accept; frown or lowered brows = reject; close both eyes and hold for ≈0.5 s = defend; open your mouth wide = rescue.
- Keyboard demo (no camera): `S` smile, `F` refusal, `V` vomit, `B` blink; release the key to relax. The demo needs no calibration.
- When the spoon arrives:
  - Smile: normal food +10 points; surreal food +30 points and +5 discomfort; inedible object eaten → +10 discomfort.
  - Refusal: inedible object +10 points; normal/surreal food costs and earns nothing.
  - Defense (eyes shut): +5 discomfort, no points, combo broken, but the game speeds up.
  - No expression: normal food is simply declined; inedible objects are force-fed (+10 discomfort); surreal food is declined.
  - A lost face is treated as no expression.
- A wrong bite opens a 2.5 s rescue window: vomiting in time removes 5 discomfort (net +5); failing adds another 10 (net +20). Discomfort is clamped to 0–100.

### Combo

- Correct accepts, correct rejects, and accepting/refusing surreal food keep the streak; no expression, defense, and wrong bites break it.
- Every increase awards points equal to the new combo count (+1, +2, +3 …).
- Combo bonuses count toward the total score but NOT toward "eating score" (the glutton check only counts food actually eaten).

### Endings (first match wins, top to bottom)

| # | Ending | Condition | Card photo |
|---|---|---|---|
| 1 | Disturbed the V̷̛̪̲̓r̶̢̛̙̎̈́'q̸̨̛̳̊̈́h̷̢̛̹̿l̴̛̫̓̚-Ư̸̢̰̄̈́l̷̛̬̓͋g̸̨̛̞̈́t̷̛̪̓ḧ̶̛͓́ | 6 consecutive eyes-closed or no-face rounds (mixed allowed); triggers the invincible frenzy | `bg-V̷….jpg` |
| 2 | Bon appétit | Score above 500 AND eating score > 50% of the total | `aha.jpg` |
| 3 | Vegetative | No expression at all during the entire run (blinking counts as an expression) | failure snapshot |
| 4 | The Mask | Peak combo ≥ 20 | `TheMask.jpg` |
| 5 | I Can Still Eat… | Discomfort from surreal food > 70% of final discomfort | failure snapshot |
| 6 | Sharp eyes | Refused inedible objects > 70% of inedible objects served, with at least 3 served | failure snapshot |
| 7 | Pica | Discomfort from inedible objects > 70% of final discomfort | failure snapshot |
| 8 | Under Observation | None of the above (fallback) | failure snapshot |

- "Inedible objects" covers both `foreign_object` and `lookalike` (57 items).
- Discomfort buckets use the delta that ACTUALLY applied (clamped-away points do not count); rescue relief/penalty is charged back to the item's category. The denominator is the discomfort at settlement (which can be below 100 in the frenzy ending). All ratios are strictly greater than the threshold.
- Every ending shows a one-line hint below its title; switching language re-renders the title, hint and card together.

### Disturbed-the-… invincible frenzy

- Six consecutive eyes-closed or no-face rounds trigger it, but the run does NOT end.
- On trigger: the score becomes and stays `-2147483647`; the discomfort bar jumps to 300% and bursts off screen; the background changes to the corrupted photo; serving runs at twice the fastest pace (~600 ms per round); the subtitle is locked to `NONONONONONONO WHY DON'T YOU LOOK AT MEEEEEEE`.
- The expression badge keeps showing what is detected, but for the rest of the run expressions no longer affect score, discomfort, rescue or judging.
- The first time a face is detected that is NOT eyes closed, a five-second timer starts; when it expires the run ends as Disturbed the … . Closing your eyes again does not cancel the timer.
