// Game orchestration: camera + face detection + feeding state machine.
// Pure rules live in logic.js; this file only wires detection to the DOM.

import { initFaceLandmarker, detectFace, openCamera } from './face.js';
import {
  EXPRESSIONS,
  INTENT,
  OUTCOME,
  classifyExpression,
  intentFromExpression,
  judge,
  buildThresholds,
  speedForRound,
  applyRescue,
  randomItem,
  SCORING,
} from './logic.js';

const RESULT_MS = 900;
const RESCUE_MS = 2500;
const SAMPLE_MS = 1500;

const NURSE_LINES = ['来，啊——', '张嘴，乖。', '补补营养。', '尝尝这个。', '今天也要乖乖的。'];

const BADGE_TEXT = {
  [EXPRESSIONS.SMILE]: '微笑 · 接受',
  [EXPRESSIONS.FROWN]: '撇嘴 · 拒绝',
  [EXPRESSIONS.VOMIT]: '张嘴伸舌 · 呕吐',
  [EXPRESSIONS.NEUTRAL]: '无表情',
  none: '未检测到人脸',
};

export async function startGame(mode = 'camera') {
  const el = {
    video: document.getElementById('cam'),
    overlay: document.getElementById('overlay'),
    panel: document.getElementById('panel'),
    score: document.getElementById('score'),
    discomfortFill: document.getElementById('discomfortFill'),
    spoon: document.getElementById('spoon'),
    item: document.getElementById('item'),
    badge: document.getElementById('exprBadge'),
    subtitle: document.getElementById('subtitle'),
    patient: document.getElementById('patient'),
  };

  const state = {
    phase: 'idle',
    score: 0,
    discomfort: 0,
    round: 0,
    thresholds: null,
    item: null,
    phaseStart: 0,
    phaseDuration: 0,
    lastIntent: INTENT.NEUTRAL,
    rescueResolved: false,
    startTime: 0,
    wrongEats: 0,
    lastCategories: null,
  };

  const setScore = () => (el.score.textContent = String(state.score));
  const setDiscomfort = () =>
    (el.discomfortFill.style.width = `${(state.discomfort / SCORING.MAX_DISCOMFORT) * 100}%`);
  const setBadge = (expr) => {
    el.badge.textContent = BADGE_TEXT[expr] ?? BADGE_TEXT.none;
    el.badge.dataset.expr = expr;
  };
  const setSubtitle = (text) => (el.subtitle.textContent = text);

  // --- keyboard demo mode (no camera) -------------------------------------
  const isDemo = mode === 'demo';
  const KEY_MAP = { s: 'smile', f: 'frown', v: 'vomit' };
  let demoExpr = null;
  if (isDemo) {
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (KEY_MAP[k]) demoExpr = KEY_MAP[k];
    });
    window.addEventListener('keyup', (e) => {
      const k = e.key.toLowerCase();
      if (KEY_MAP[k]) demoExpr = null;
    });
  }
  function demoCategories(expr) {
    const base = { mouthSmileLeft: 0, mouthSmileRight: 0, mouthFrownLeft: 0, mouthFrownRight: 0, jawOpen: 0, tongueOut: 0 };
    if (expr === 'smile') Object.assign(base, { mouthSmileLeft: 1, mouthSmileRight: 1 });
    else if (expr === 'frown') Object.assign(base, { mouthFrownLeft: 1, mouthFrownRight: 1 });
    else if (expr === 'vomit') Object.assign(base, { jawOpen: 1, tongueOut: 1 });
    return Object.entries(base).map(([categoryName, score]) => ({ categoryName, score }));
  }
  function currentCategories() {
    return isDemo ? demoCategories(demoExpr) : detectFace(el.video);
  }

  function showOverlay(html) {
    el.panel.innerHTML = html;
    el.overlay.hidden = false;
  }
  function hideOverlay() {
    el.overlay.hidden = true;
  }

  // --- calibration ---------------------------------------------------------
  function aggregate(categories) {
    const score = (name) => {
      if (!categories) return 0;
      for (const c of categories) if (c.categoryName === name) return c.score;
      return 0;
    };
    return {
      smile: (score('mouthSmileLeft') + score('mouthSmileRight')) / 2,
      frown: (score('mouthFrownLeft') + score('mouthFrownRight')) / 2,
      jaw: score('jawOpen'),
      tongue: score('tongueOut'),
    };
  }

  function sampleMax(durationMs) {
    return new Promise((resolve) => {
      const max = { smile: 0, frown: 0, jaw: 0, tongue: 0 };
      const end = performance.now() + durationMs;
      const tick = () => {
        const a = aggregate(detectFace(el.video));
        max.smile = Math.max(max.smile, a.smile);
        max.frown = Math.max(max.frown, a.frown);
        max.jaw = Math.max(max.jaw, a.jaw);
        max.tongue = Math.max(max.tongue, a.tongue);
        if (performance.now() < end) requestAnimationFrame(tick);
        else resolve(max);
      };
      requestAnimationFrame(tick);
    });
  }

  async function calibrate() {
    const cal = {};
    const steps = [
      { key: 'neutral', title: '校准 1/4 · 放松', hint: '保持自然表情，点击开始采样。' },
      { key: 'smile', title: '校准 2/4 · 微笑', hint: '露出明显的微笑，点击开始采样。' },
      { key: 'frown', title: '校准 3/4 · 撇嘴', hint: '向下撇嘴表示拒绝，点击开始采样。' },
      { key: 'vomit', title: '校准 4/4 · 呕吐', hint: '张大嘴并尽量伸舌头，点击开始采样。' },
    ];
    for (const step of steps) {
      await new Promise((done) => {
        showOverlay(
          `<h1>${step.title}</h1><p>${step.hint}</p>` +
          `<button id="calBtn" type="button">开始采样</button>`
        );
        document.getElementById('calBtn').addEventListener('click', async () => {
          setSubtitle('采集中…');
          cal[step.key] = await sampleMax(SAMPLE_MS);
          done();
        });
      });
    }
    state.thresholds = buildThresholds(cal);
  }

  // --- round flow ----------------------------------------------------------
  function startRound() {
    state.round += 1;
    state.item = randomItem();
    el.item.textContent = state.item.emoji;
    const speed = speedForRound(state.round - 1);
    state.phase = 'serving';
    state.phaseStart = performance.now();
    state.phaseDuration = speed.travelMs;
    setSubtitle(state.item.line || NURSE_LINES[state.round % NURSE_LINES.length]);
  }

  function resolveServe() {
    const outcome = judge(state.item, state.lastIntent);
    state.score += outcome.scoreDelta;
    state.discomfort = Math.max(0, Math.min(SCORING.MAX_DISCOMFORT, state.discomfort + outcome.discomfortDelta));
    setScore();
    setDiscomfort();

    if (outcome.type === OUTCOME.WRONG_EAT) {
      state.wrongEats += 1;
      state.phase = 'rescue';
      state.rescueResolved = false;
      state.phaseStart = performance.now();
      state.phaseDuration = RESCUE_MS;
      setSubtitle('误食！快张嘴伸舌呕吐！');
      return;
    }
    flashResult(outcome);
  }

  function flashResult(outcome) {
    const msg = {
      [OUTCOME.CORRECT_ACCEPT]: '好吃！+10',
      [OUTCOME.CORRECT_REJECT]: '拒得好！+10',
      [OUTCOME.DECLINED_FOOD]: '你拒绝了食物',
    }[outcome.type];
    setSubtitle(msg);
    state.phase = 'result';
    state.phaseStart = performance.now();
    state.phaseDuration = RESULT_MS;
  }

  function resolveRescue(success) {
    const before = state.discomfort;
    state.discomfort = applyRescue(before, success);
    setDiscomfort();
    setSubtitle(success ? `呕吐成功，难受 -${before - state.discomfort}` : '没吐出来，更难受了…');
    state.phase = 'result';
    state.phaseStart = performance.now();
    state.phaseDuration = RESULT_MS;
  }

  function gameOver() {
    state.phase = 'gameover';
    const seconds = Math.round((performance.now() - state.startTime) / 1000);
    showOverlay(
      `<h1>游戏结束</h1>` +
      `<p>得分 <strong>${state.score}</strong></p>` +
      `<p>坚持 <strong>${seconds}</strong> 秒 · 误食 <strong>${state.wrongEats}</strong> 次</p>` +
      `<button id="againBtn" type="button">再来一次</button>`
    );
    document.getElementById('againBtn').addEventListener('click', () => location.reload());
  }

  // --- main loop -----------------------------------------------------------
  function loop(now) {
    const categories = currentCategories();
    state.lastCategories = categories;
    const expr = classifyExpression(categories, state.thresholds);
    setBadge(categories ? expr : 'none');

    if (state.phase === 'serving') {
      const progress = Math.min(1, (now - state.phaseStart) / state.phaseDuration);
      el.spoon.style.top = `${8 + progress * 60}%`;
      el.spoon.style.opacity = '1';
      state.lastIntent = intentFromExpression(categories, state.thresholds);
      if (progress >= 1) resolveServe();
    } else if (state.phase === 'rescue') {
      if (!state.rescueResolved) {
        if (expr === EXPRESSIONS.VOMIT) {
          state.rescueResolved = true;
          resolveRescue(true);
        } else if (now - state.phaseStart >= state.phaseDuration) {
          state.rescueResolved = true;
          resolveRescue(false);
        }
      }
    } else if (state.phase === 'result') {
      el.spoon.style.opacity = '0.25';
      if (now - state.phaseStart >= state.phaseDuration) {
        if (state.discomfort >= SCORING.MAX_DISCOMFORT) gameOver();
        else startRound();
      }
    }

    // Game over is decided when a result/feedback phase ends, so a maxed-out
    // rescue still gets to play before the screen switches.
    requestAnimationFrame(loop);
  }

  // --- boot ----------------------------------------------------------------
  try {
    if (isDemo) {
      state.thresholds = buildThresholds(null); // use literature floors; no calibration
      hideOverlay();
      setSubtitle('键盘：S 接受 · F 拒绝 · V 呕吐 · 松开 无表情');
      state.startTime = performance.now();
      startRound();
      requestAnimationFrame(loop);
      return;
    }
    showOverlay('<h1>表情喂食</h1><p>正在打开摄像头并加载模型…</p>');
    const stream = await openCamera();
    el.video.srcObject = stream;
    await el.video.play();
    await initFaceLandmarker();
    hideOverlay();
    await calibrate();
    hideOverlay();
    state.startTime = performance.now();
    startRound();
    requestAnimationFrame(loop);
  } catch (err) {
    showOverlay(
      `<h1>无法启动</h1><p>${err.message || err}</p>` +
      `<p>请允许摄像头权限，并用支持 WebRTC 的浏览器（桌面 Chrome/Edge）打开。</p>`
    );
  }
}
