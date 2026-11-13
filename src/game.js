import { createEyeHold, protectedEyeExpression } from './eye-hold.js';
// Game orchestration: camera + face detection + feeding state machine.
// Pure rules live in logic.js; this file only wires detection to the DOM.

import { initFaceLandmarker, detectFace, detectFaceFrame, openCamera } from './face.js';
import {
  EXPRESSIONS,
  INTENT,
  OUTCOME,
  judge,
  speedForLevel,
  applyRescue,
  randomItem,
  SCORING,
} from './logic.js';

import {
  classifyGameExpression as classifyExpression,
  gameIntentFromExpression as intentFromExpression,
  gameEyesClosed as eyesClosed,
  getBaseline, setPlayerProfile,
} from './face-settings.js';

const RESULT_MS = 900;
const RESCUE_MS = 2500;
import { FACE_LABELS } from './face-labels.js';
import { createFaceCalibration, SAMPLE_MS } from './face-calibration.js';
// Eyes must stay shut for this long before the spoon lands. A natural blink
// (~100ms) is too short, so it can no longer fake a defense.

// rAF runs at 60-144fps while the webcam is usually ~30fps, so most frames
// have no fresh camera data. Only report NO FACE after this long without ANY
// valid detection; brief gaps reuse the last good frame instead.
const FACE_LOST_MS = 400;

const NURSE_LINES = [
  'Open up. It is for your own good.',
  'Be a dear and swallow.',
  'Doctor says you need the nutrients.',
  'Try this little something.',
  'You are doing so well today.',
];

// Badge renders two lines: a big primary label + a small secondary note.
const BADGE_TEXT = {
  [EXPRESSIONS.SMILE]: [FACE_LABELS.smile, 'accepting'],
  [EXPRESSIONS.REFUSAL]: [FACE_LABELS.refusal, 'refusing'],
  [EXPRESSIONS.VOMIT]: [FACE_LABELS.vomit, 'purging'],
  [EXPRESSIONS.BLINK]: [FACE_LABELS.blink, 'defending'],
  [EXPRESSIONS.NEUTRAL]: [FACE_LABELS.neutral, 'no action'],
  none: [FACE_LABELS.none, 'not detected'],
};

export async function startGame(mode = 'camera', opts = {}) {
  const eyeHold = createEyeHold();
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
    combo: document.getElementById('combo'),
  };

  const state = {
    phase: 'idle',
    score: 0,
    discomfort: 0,
    round: 0,
    level: 0,
    thresholds: null,
    item: null,
    phaseStart: 0,
    phaseDuration: 0,
    lastIntent: INTENT.NEUTRAL,
    rescueResolved: false,
    prevExpr: null,
    startTime: 0,
    wrongEats: 0,
    combo: 0,
    lastCategories: null,
    lastFaceAt: 0, // timestamp of the last valid face detection
    failShot: null,
    maxCombo: 0,
    closedSince: 0, // timestamp of the start of the current eyes-shut hold
  };

  const setScore = () => (el.score.textContent = String(state.score));
  const setDiscomfort = () =>
    (el.discomfortFill.style.width = `${(state.discomfort / SCORING.MAX_DISCOMFORT) * 100}%`);
  let shownExpr = null;
  const setBadge = (expr) => {
    if (expr === shownExpr) return; // rebuild only when the pose changes
    shownExpr = expr;
    const [main, sub] = BADGE_TEXT[expr] ?? BADGE_TEXT.none;
    const top = document.createElement('span');
    top.className = 'badge-main';
    top.textContent = main;
    const bottom = document.createElement('span');
    bottom.className = 'badge-sub';
    bottom.textContent = sub;
    el.badge.replaceChildren(top, bottom);
    el.badge.dataset.expr = expr;
  };
  const setSubtitle = (text) => {
    el.subtitle.textContent = text;
    // Long one-off legends would otherwise overflow the fixed-height bubble.
    el.subtitle.classList.toggle('long', text.length > 44);
  };
  const setCombo = () => {
    if (state.combo > state.maxCombo) state.maxCombo = state.combo;
    el.combo.textContent = `combo ×${state.combo}`;
    el.combo.hidden = state.combo < 2; // a streak only shows from ×2 up
    if (state.combo >= 2) {
      el.combo.classList.remove('pop');
      void el.combo.offsetWidth; // restart the pop animation
      el.combo.classList.add('pop');
    }
  };

  // --- keyboard demo mode (no camera) -------------------------------------
  const isDemo = mode === 'demo';
  const KEY_MAP = { s: 'smile', f: 'refusal', v: 'vomit', b: 'blink' };
  let demoExpr = null;
  if (isDemo) {
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (KEY_MAP[k]) {
        demoExpr = KEY_MAP[k];
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => {
      const k = e.key.toLowerCase();
      if (KEY_MAP[k]) demoExpr = null;
    });
  }
  function demoCategories(expr) {
    const base = { mouthSmileLeft: 0, mouthSmileRight: 0, mouthFrownLeft: 0, mouthFrownRight: 0, jawOpen: 0, eyeBlinkLeft: 0, eyeBlinkRight: 0 };
    if (expr === 'smile') Object.assign(base, { mouthSmileLeft: 1, mouthSmileRight: 1 });
    else if (expr === 'refusal') Object.assign(base, { mouthFrownLeft: 1, mouthFrownRight: 1 });
    else if (expr === 'vomit') Object.assign(base, { jawOpen: 1 });
    else if (expr === 'blink') Object.assign(base, { eyeBlinkLeft: 1, eyeBlinkRight: 1, eyeSquintLeft: 1, eyeSquintRight: 1 });
    return Object.entries(base).map(([categoryName, score]) => ({ categoryName, score }));
  }
  function currentCategories() {
    return isDemo ? demoCategories(demoExpr) : detectFace(el.video);
  }

  function showOverlay(html, variant = '') {
    el.panel.innerHTML = html;
    el.panel.className = variant ? `panel ${variant}` : 'panel';
    el.overlay.hidden = false;
  }
  function hideOverlay() {
    el.overlay.hidden = true;
  }

  // --- calibration ---------------------------------------------------------
  async function calibrate() {
    const baseline = getBaseline();
    const calibration = createFaceCalibration(baseline);
    await new Promise((done) => {
      function render(status) {
        if (status.completed) {
          state.thresholds = { baseline, profile: status.profile };
          setPlayerProfile(status.profile);
          done();
          return;
        }
        showOverlay(
          `<h1>${status.step.title}</h1>` +
          `<div class="calibration-clock" id="calClock" role="progressbar" aria-label="Sampling progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">` +
          `<svg class="calibration-ring" viewBox="0 0 120 120" aria-hidden="true">` +
          `<circle class="calibration-ring-track" cx="60" cy="60" r="56"/>` +
          `<circle id="calRing" class="calibration-ring-progress" cx="60" cy="60" r="56" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100"/></svg>` +
          `<img class="calibration-image" src="${status.step.image}" alt="${status.step.imageAlt}"></div>` +
          `<p>${status.step.hint}</p>` +
          (status.error ? `<p>${status.error}</p>` : '') +
          `<button id="calBtn" type="button">Start sampling</button>` +
          `<button id="skipCalBtn" type="button">Skip</button>`
        );
        document.getElementById('skipCalBtn').addEventListener('click', () => {
          state.thresholds = { baseline, profile: null };
          setPlayerProfile(null);
          done();
        }, { once: true });
        document.getElementById('calBtn').addEventListener('click', (event) => {
          event.currentTarget.disabled = true;
          document.getElementById('skipCalBtn').disabled = true;
          const clock = document.getElementById('calClock');
          const ring = document.getElementById('calRing');
          event.currentTarget.textContent = 'Sampling…';
          calibration.startSample(performance.now());
          function tick(now) {
            const result = detectFaceFrame(el.video);
            const next = calibration.feed(result.inferred && result.freshVideoFrame !== false ? result.categories : null, now, result.eyeGeometry);
            const progress = Math.max(0, Math.min(1, 1 - next.remainingMs / SAMPLE_MS));
            ring.setAttribute('stroke-dashoffset', String(100 * (1 - progress)));
            clock.setAttribute('aria-valuenow', String(Math.round(progress * 100)));
            setSubtitle(`Sampling… ${(next.remainingMs / 1000).toFixed(1)} s`);
            if (next.sampling) requestAnimationFrame(tick);
            else requestAnimationFrame(() => render(next));
          }
          requestAnimationFrame(tick);
        }, { once: true });
      }
      render(calibration.snapshot());
    });
  }

  // --- round flow ----------------------------------------------------------
  function startRound() {
    state.round += 1;
    eyeHold.reset();
    state.closedSince = 0; // each serve starts a fresh eyes-shut hold
    state.item = randomItem();
    el.item.src = state.item.image;
    el.item.alt = state.item.name;
    const speed = speedForLevel(state.level);
    state.phase = 'serving';
    state.phaseStart = performance.now();
    state.phaseDuration = speed.travelMs;
    el.spoon.style.opacity = '0';
    el.spoon.style.transform = 'translate(-74%, -70%) scale(2)';
    setSubtitle(state.item.line || NURSE_LINES[state.round % NURSE_LINES.length]);
  }

  function resolveServe() {
    const outcome = judge(state.item, state.lastIntent);
    state.score += outcome.scoreDelta;
    state.discomfort = Math.max(0, Math.min(SCORING.MAX_DISCOMFORT, state.discomfort + outcome.discomfortDelta));
    setScore();
    setDiscomfort();

    // Correct plays AND eye-defense both accelerate the game (level up). But
    // defense breaks the combo streak even though it speeds things up.
    if (outcome.type === OUTCOME.CORRECT_ACCEPT || outcome.type === OUTCOME.CORRECT_REJECT || outcome.type === OUTCOME.DEFENDED) {
      state.level += 1;
      if (outcome.type === OUTCOME.DEFENDED) state.combo = 0;
      else state.combo += 1;
    } else if (outcome.type === OUTCOME.WRONG_EAT) {
      state.level = Math.max(0, state.level - 1);
      state.combo = 0;
    } else {
      state.combo = 0; // DECLINED_FOOD (missed a good bite) breaks the streak
    }
    setCombo();

    if (outcome.type === OUTCOME.WRONG_EAT) {
      state.wrongEats += 1;
      state.failShot = captureFrame(); // grab the face at the moment of failure
      state.phase = 'rescue';
      state.rescueResolved = false;
      state.phaseStart = performance.now();
      state.phaseDuration = RESCUE_MS;
      setSubtitle('Wrong bite! Gag now!');
      return;
    }
    flashResult(outcome);
  }

  function flashResult(outcome) {
    let msg;
    if (outcome.type === OUTCOME.DEFENDED) {
      // Nurse nags you for shutting your eyes instead of eating -- rotate lines.
      const lines = ['Excuse me?!', 'You Need To EAT!', "Don't go hungry.", 'Anyone there?'];
      msg = lines[Math.floor(Math.random() * lines.length)];
    } else {
      msg = {
        [OUTCOME.CORRECT_ACCEPT]: 'Swallowed. +10',
        [OUTCOME.CORRECT_REJECT]: 'Rejected. +10',
        [OUTCOME.DECLINED_FOOD]: 'You declined food.',
      }[outcome.type];
    }
    setSubtitle(msg);
    state.phase = 'result';
    state.phaseStart = performance.now();
    state.phaseDuration = RESULT_MS;
  }

  function resolveRescue(success) {
    const before = state.discomfort;
    state.discomfort = applyRescue(before, success);
    setDiscomfort();
    setSubtitle(success ? `Upchucked. Discomfort -${before - state.discomfort}` : 'Held it in. Discomfort worsens…');
    state.phase = 'result';
    state.phaseStart = performance.now();
    state.phaseDuration = RESULT_MS;
  }

  // --- restart -------------------------------------------------------------
  // A run ends only when discomfort hits MAX; the camera stream, the landmark
  // model and this player's thresholds all survive it. Reloading the page for
  // Play Again would ask for camera permission again and replay all five
  // calibration samples, which is only useful when the player changes.
  function resetRun() {
    Object.assign(state, {
      phase: 'idle',
      score: 0,
      discomfort: 0,
      round: 0,
      level: 0,
      item: null,
      phaseStart: 0,
      phaseDuration: 0,
      lastIntent: INTENT.NEUTRAL,
      rescueResolved: false,
      prevExpr: null,
      startTime: performance.now(),
      wrongEats: 0,
      combo: 0,
      lastCategories: null,
      lastFaceAt: 0,
      failShot: null,
      maxCombo: 0,
      closedSince: 0,
    });
    setScore();
    setDiscomfort();
    setCombo();
  }

  // Same player -> keep the calibration and restart in place. New player (or a
  // big lighting/camera change) -> sample the five expressions again. The
  // choice is explicit: blendshapes cannot tell us who is in front of the lens.
  async function restartGame(recalibrate) {
    if (recalibrate && !isDemo) await calibrate();
    resetRun();
    hideOverlay();
    startRound();
    requestAnimationFrame(loop);
  }

  function gameOver() {
    state.phase = 'gameover';
    const seconds = Math.round((performance.now() - state.startTime) / 1000);
    if (!state.failShot) state.failShot = captureFrame(); // fallback grab if no prior fail
    const card = buildResultCard(state.failShot, {
      score: state.score,
      seconds,
      wrongEats: state.wrongEats,
      maxCombo: state.maxCombo,
      resultTitle: 'The Crush', // placeholder: swap for a per-run result label
    });
    const cardUrl = card.toDataURL('image/png');
    showOverlay(
      `<h1>Game Over</h1>` +
      `<img id="resultCard" class="result-card" src="${cardUrl}" alt="Feeding Result Card">` +
      `<div class="card-actions${isDemo ? '' : ' two-up'}">` +
      `<button id="againBtn" type="button" title="Same player: keep the current calibration">Play Again</button>` +
      (isDemo ? '' : `<button id="newPlayerBtn" type="button" title="Recalibrate for a different player or new lighting">New Player</button>`) +
      `</div>` +
      `<div class="card-actions save-row">` +
      `<button id="saveCardBtn" type="button">Save Result Card</button>` +
      `</div>` +
      `<p class="share-note">Share your feeding!</p>`,
      'gameover-panel'
    );
    document.getElementById('againBtn').addEventListener('click', () => {
      // Fall back to calibration only if no thresholds exist for this session.
      restartGame(!state.thresholds);
    });
    document.getElementById('newPlayerBtn')?.addEventListener('click', () => {
      restartGame(true);
    });
    document.getElementById('saveCardBtn').addEventListener('click', () => {
      card.toBlob((blob) => {
        if (!blob) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'expression-feeding-result.png';
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      });
    });
  }

  // Snapshot the live camera frame (mirrored, to match the on-screen view) as a
  // canvas. Used at the failure moment and as the share-card background.
  function captureFrame() {
    const v = el.video;
    if (!v || !v.videoWidth) return null;
    const c = document.createElement('canvas');
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const ctx = c.getContext('2d');
    ctx.save();
    ctx.translate(c.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(v, 0, 0, c.width, c.height);
    ctx.restore();
    return c;
  }

  // Compose a portrait share card: the failure frame behind a dark scrim, with
  // the game name and a stat block. Returns a canvas ready to download.
  function buildResultCard(failCanvas, s) {
    const W = 720;
    const H = 1080;
    const card = document.createElement('canvas');
    card.width = W;
    card.height = H;
    const ctx = card.getContext('2d');
    ctx.fillStyle = '#162a29';
    ctx.fillRect(0, 0, W, H);
    if (failCanvas) {
      const scale = Math.max(W / failCanvas.width, H / failCanvas.height);
      const dw = failCanvas.width * scale;
      const dh = failCanvas.height * scale;
      ctx.drawImage(failCanvas, (W - dw) / 2, (H - dh) / 2, dw, dh);
      ctx.fillStyle = 'rgba(10,20,20,0.55)';
      ctx.fillRect(0, 0, W, H);
    }
    // Same pixel typefaces as the on-screen UI: Press Start 2P for the
    // heading, VT323 for the rest of the card. The card is displayed at ~0.5x,
    // so the canvas type needs to be about twice the on-screen target.
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f3b66c';
    ctx.font = '700 42px "Press Start 2P", monospace';
    // maxWidth keeps the enlarged type inside the card even when the pixel
    // webfonts are unavailable and a wider monospace fallback is used.
    ctx.fillText('EXPRESSION', W / 2, 112, W - 120);
    ctx.fillText('FEEDING', W / 2, 168, W - 120);
    ctx.fillStyle = '#f5f0df';
    ctx.font = '700 58px "VT323", monospace';
    ctx.fillText('Feeding Results', W / 2, 238, W - 120);
    // Per-run result label; 'The Crush' is only a placeholder for now.
    ctx.fillText(s.resultTitle || 'The Crush', W / 2, 310, W - 120);
    // Game Over only fires at MAX_DISCOMFORT, so a "final discomfort" row
    // would always read 100/100 and carry no information.
    const rows = [
      ['SCORE', String(s.score)],
      ['SURVIVED', `${s.seconds}s`],
      ['BAD BITES', String(s.wrongEats)],
      ['MAX COMBO', `x${s.maxCombo}`],
    ];
    ctx.textAlign = 'left';
    ctx.font = '600 50px "VT323", monospace';
    let y = 400;
    for (const [k, v] of rows) {
      ctx.fillStyle = '#f5f0df';
      ctx.fillText(k, 90, y, 250);
      ctx.fillStyle = '#f3b66c';
      ctx.textAlign = 'right';
      ctx.fillText(v, W - 90, y, 250);
      ctx.textAlign = 'left';
      y += 110;
    }
    // "Share your feeding!" is HTML outside the card, so a saved PNG contains
    // only the artwork and the stats, never that line.
    return card;
  }

  // --- main loop -----------------------------------------------------------
  function loop(now) {
    const detection = isDemo ? { inferred: true, categories: currentCategories(), eyeGeometry: { left: demoExpr === 'blink' ? 0 : 0.3, right: demoExpr === 'blink' ? 0 : 0.3 } } : detectFaceFrame(el.video);
    const fresh = detection.categories;
    if (fresh) {
      state.lastCategories = fresh;
      state.eyeGeometry = detection.eyeGeometry;
      state.lastFaceAt = now;
    }
    // A missing result usually means "no new webcam frame yet", not "no face".
    // Reuse the last good detection for BOTH the badge and the judgement; only
    // give up after FACE_LOST_MS without any valid frame.
    const faceLost = !state.lastFaceAt || now - state.lastFaceAt > FACE_LOST_MS;
    if (faceLost) state.closedSince = 0;
    const face = faceLost ? null : state.lastCategories;
    const hold = eyeHold.update({ inferred: detection.inferred, closed: detection.freshVideoFrame !== false && !!fresh && eyesClosed(fresh, state.thresholds, detection.eyeGeometry), now, durationMs: state.thresholds?.baseline.eyeHoldMs ?? 500 });
    let expr = classifyExpression(face, state.thresholds, state.eyeGeometry);
    expr = protectedEyeExpression(expr, isDemo || hold.ready);
    setBadge(faceLost ? 'none' : expr);

    if (state.phase === 'serving') {
      const progress = Math.min(1, (now - state.phaseStart) / state.phaseDuration);
      // Spoon+food grow together, pinned at the bowl (screen centre).
      el.spoon.style.transform = `translate(-74%, -70%) scale(${2 + progress * 2})`;
      // Fade the hand+spoon to opaque quickly (within the first 25% of the
      // serve), then hold. The scale motion above is unchanged.
      el.spoon.style.opacity = String(Math.min(1, progress * 4));
      const holdOk = isDemo || hold.ready;
      state.lastIntent = intentFromExpression(face, state.thresholds, holdOk, state.eyeGeometry);
      if (progress >= 1) resolveServe();
    } else if (state.phase === 'rescue') {
      if (!state.rescueResolved) {
        // Only a fresh vomit edge counts: if the player was already holding the
        // vomit face from the feeding phase, they must release and re-do it.
        // Otherwise holding V the whole time would auto-pass both food types.
        if (state.prevExpr !== EXPRESSIONS.VOMIT && expr === EXPRESSIONS.VOMIT) {
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
    state.prevExpr = expr;
    // Game Over stops the chain; restartGame() starts exactly one fresh loop.
    if (state.phase !== 'gameover') requestAnimationFrame(loop);
  }

  // --- boot ----------------------------------------------------------------
  try {
    if (isDemo) {
      state.thresholds = { baseline: getBaseline(), profile: null }; // demo bypasses player correction
      hideOverlay();
      setSubtitle('S smile · F refusal · V vomit · B eyes closed · release = neutral');
      state.startTime = performance.now();
      startRound();
      requestAnimationFrame(loop);
      return;
    }
    showOverlay('<h1>Expression Feeding</h1><p>Opening camera and loading model…</p>');
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
      `<h1>Could not start</h1><p>${err.message || err}</p>` +
      `<p>Grant camera permission and open this in a WebRTC-capable browser (desktop Chrome/Edge).</p>`
    );
  }
}
