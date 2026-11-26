import { createEyeHold, protectedEyeExpression } from './eye-hold.js';
// Game orchestration: camera + face detection + feeding state machine.
// Pure rules live in logic.js; this file only wires detection to the DOM.

import { initFaceLandmarker, detectFace, detectFaceFrame, openCamera } from './face.js';
import {
  EXPRESSIONS,
  INTENT,
  OUTCOME,
  judge,
  expressionScores,
  comboContinues,
  speedForLevel,
  applyRescue,
  randomItem,
  feedbackTone,
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
// Twice the fastest serving pace, with a short result beat so the frenzy
// does not stall between bites.
const FRENZY_TRAVEL_MS = speedForLevel(100).travelMs / 2;
const FRENZY_RESULT_MS = FRENZY_TRAVEL_MS / 3;
import { t, getLanguage, faceLabel, onLanguageChange } from './i18n.js';
import { foodText } from './food-catalogue.js';
import { GLITCH_PHOTO } from './cthulhu.js';
import { createSfx } from './sfx.js';
import { preloadImage, prefetchImages } from './food-image.js';
import {
  createResultStats, recordServe, recordRescue, determineResult, comboScoreBonus,
  sixtySevenField, RESULT, RESULT_PHOTO, CTHULHU_STREAK,
} from './result.js';
import { createFaceCalibration, SAMPLE_MS } from './face-calibration.js';
import { TRIALS, TRIAL_FOOD_COUNT, TRIAL_PASS_COUNT, TRIAL_WINDOW_MS, trialHit, trialPassed, pickTrialFoods } from './calibration-trial.js';
import { FOOD_ITEMS } from './food-catalogue.js';
// Eyes must stay shut for this long before the spoon lands. A natural blink
// (~100ms) is too short, so it can no longer fake a defense.

// rAF runs at 60-144fps while the webcam is usually ~30fps, so most frames
// have no fresh camera data. Only report NO FACE after this long without ANY
// valid detection; brief gaps reuse the last good frame instead.
const FACE_LOST_MS = 400;

// Badge renders two lines: a big primary label + a small secondary note.
// Resolved per call so the 中/EN switch re-renders in the active language.
function badgeText(expr) {
  const sub = {
    [EXPRESSIONS.SMILE]: 'accepting',
    [EXPRESSIONS.REFUSAL]: 'refusing',
    [EXPRESSIONS.VOMIT]: 'purging',
    [EXPRESSIONS.BLINK]: 'defending',
    [EXPRESSIONS.NEUTRAL]: 'noAction',
    none: 'notDetected',
  }[expr] ?? 'notDetected';
  const face = expr === 'none' ? 'none' : expr; // EXPRESSIONS values match face.* keys
  return [faceLabel(face), t(`badge.${sub}`)];
}
// Overlay renderer for the active screen (calibration / game over), so the
// language toggle can rebuild the visible panel without restarting the run.
let rerenderOverlay = null;

export async function startGame(mode = 'camera', opts = {}) {
  const eyeHold = createEyeHold();
  const sfx = createSfx((src) => new Audio(src));
  const el = {
    video: document.getElementById('cam'),
    bg: document.getElementById('bg'),
    overlay: document.getElementById('overlay'),
    panel: document.getElementById('panel'),
    score: document.getElementById('score'),
    discomfortFill: document.getElementById('discomfortFill'),
    spoon: document.getElementById('spoon'),
    ambient: document.getElementById('ambient'),
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
    settleSeconds: null, // frozen at first settlement so a language re-render cannot change the result
    wrongEats: 0,
    combo: 0,
    lastCategories: null,
    lastFaceAt: 0, // timestamp of the last valid face detection
    failShot: null,
    maxCombo: 0,
    closedSince: 0, // timestamp of the start of the current eyes-shut hold
    stats: createResultStats(),
    cthulhu: false,
    cthulhuExitAt: 0,
    lastFaceLost: false,
  };

  const setScore = () => (el.score.textContent = String(state.score));
  const setDiscomfort = () =>
    (el.discomfortFill.style.width = state.cthulhu
      ? '300%' // the bar bursts out of its container and off screen
      : `${(state.discomfort / SCORING.MAX_DISCOMFORT) * 100}%`);
  let shownExpr = null;
  const setBadge = (expr) => {
    if (expr === shownExpr) return; // rebuild only when the pose changes
    shownExpr = expr;
    const [main, sub] = badgeText(expr);
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
  };
  // Ambient edge glow: a tone clears automatically when null. The rescue tone
  // is dropped when the next round starts or the run ends, never left hanging.
  const setAmbient = (tone) => {
    if (!el.ambient) return;
    if (tone) el.ambient.dataset.tone = tone;
    else delete el.ambient.dataset.tone;
  };
  const setCombo = () => {
    if (state.combo > state.maxCombo) state.maxCombo = state.combo;
    el.combo.textContent = t('combo', { n: state.combo });
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
  const cap = (key) => key[0].toUpperCase() + key.slice(1);
  const stepFaceKey = (key) => (key === 'frown' ? 'refusal' : key === 'jaw' ? 'vomit' : key);
  const calHint = (key) => t(`calHint${cap(key)}`);
  const calAlt = (key) => t(`calAlt${cap(key)}`);
  const calStepTitle = (step, index) => t('calStep', { n: index + 1, label: faceLabel(stepFaceKey(step.key)) });

  async function calibrate() {
    const baseline = getBaseline();
    const calibration = createFaceCalibration(baseline);
    let finish = () => {};
    let trialRerender = null;

    // Build the pass threshold from the just-captured sample.
    function trialThreshold(stepKey, sample) {
      const stats = sample?.stats?.[stepKey];
      if (!stats) return null;
      return Math.max(0.05, stats.median * 0.85);
    }

    // Test one captured expression on a few dishes before advancing. Each
    // dish gets a short window; a hit requires the target channel to fire.
    function renderTrial(status, onPass) {
      // feed() advances the index, so the captured step is lastSample.key,
      // NOT status.step.key (which already points to the NEXT expression).
      const stepKey = status.lastSample?.key;
      const cfg = TRIALS[stepKey];
      const threshold = trialThreshold(stepKey, status.lastSample);
      const pool = FOOD_ITEMS.filter((item) => {
        if (cfg.pool === 'foreign') return item.eatable === false && item.category !== 'surreal_food';
        if (cfg.pool === 'surreal') return item.category === 'surreal_food';
        return item.eatable === true && item.category === 'food';
      });
      const foods = pickTrialFoods(pool, TRIAL_FOOD_COUNT);
      const results = [];
      let idx = 0;
      let cancelled = false;
      const label = faceLabel(stepFaceKey(stepKey));
      const need = TRIAL_PASS_COUNT;
      const total = foods.length || TRIAL_FOOD_COUNT;

      function step(isFirst) {
        if (cancelled) return;
        if (idx >= foods.length) {
          const pass = foods.length ? trialPassed(results) : true; // no pool -> don't block
          showOverlay(
            `<h1>${t(pass ? 'trialPass' : 'trialFail')}</h1>` +
            `<div class="card-actions calibration-actions">` +
            `<button id="trialNextBtn" type="button">${t(pass ? 'trialContinue' : 'trialRetry')}</button>` +
            `</div>`
          );
          document.getElementById('trialNextBtn').addEventListener('click', () => {
            if (pass) { trialRerender = null; cancelled = true; onPass(); }
            else renderTrial(status, onPass);
          }, { once: true });
          return;
        }
        const food = foods[idx];
        showOverlay(
          `<h1>${t('trialTitle', { label })}</h1>` +
          `<p>${t('trialIntro', { need, total })}</p>` +
          `<div class="trial-clock"><div class="trial-progress" id="trialBar"></div></div>` +
          `<img class="trial-food" src="${food.image}" alt="${foodText(food, getLanguage())}">` +
          `<p id="trialState">${t('trialCounting')}</p>` +
          `<p>${t('trialProgress', { n: idx + 1, total })}</p>` +
          `<div class="card-actions calibration-actions">` +
          `<button id="trialSkipBtn" type="button" class="link-button">${t('trialSkip')}</button>` +
          `</div>`
        );
        document.getElementById('trialSkipBtn').addEventListener('click', () => {
          cancelled = true;
          trialRerender = null;
          onPass();
        }, { once: true });
        const bar = document.getElementById('trialBar');
        const stateText = document.getElementById('trialState');
        const started = performance.now();
        let hit = false;
        function pump(now) {
          if (cancelled) return;
          const frame = detectFaceFrame(el.video);
          const scores = frame.inferred && frame.freshVideoFrame !== false
            ? expressionScores(frame.categories) : null;
          if (scores && threshold !== null) {
            hit = hit || trialHit(scores, cfg.channel, threshold);
          }
          const progress = Math.min(1, (now - started) / TRIAL_WINDOW_MS);
          bar.style.width = `${progress * 100}%`;
          if (progress < 1) requestAnimationFrame(pump);
          else {
            results[idx] = hit;
            stateText.textContent = hit ? t('trialHit') : t('trialMiss');
            idx += 1;
            setTimeout(() => step(false), 600);
          }
        }
        requestAnimationFrame(pump);
      }
      trialRerender = () => { cancelled = true; renderTrial(status, onPass); };
      step(true);
    }

    function render(status) {
      if (status.completed) {
        state.thresholds = { baseline, profile: status.profile };
        setPlayerProfile(status.profile);
        finish();
        return;
      }
      showOverlay(
        `<h1>${calStepTitle(status.step, status.index)}</h1>` +
        `<div class="calibration-clock" id="calClock" role="progressbar" aria-label="Sampling progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">` +
        `<svg class="calibration-ring" viewBox="0 0 120 120" aria-hidden="true">` +
        `<circle class="calibration-ring-track" cx="60" cy="60" r="56"/>` +
        `<circle id="calRing" class="calibration-ring-progress" cx="60" cy="60" r="56" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100"/></svg>` +
        `<img class="calibration-image" src="${status.step.image}" alt="${calAlt(status.step.key)}"></div>` +
        `<p>${calHint(status.step.key)}</p>` +
        (status.error ? `<p>${t(status.error)}</p>` : '') +
        `<div class="card-actions calibration-actions">` +
        `<button id="calBtn" type="button">${t('calStartSampling')}</button>` +
        `<button id="skipCalBtn" type="button">${t('calSkip')}</button>` +
        `</div>`
      );
      document.getElementById('skipCalBtn').addEventListener('click', () => {
        state.thresholds = { baseline, profile: null };
        setPlayerProfile(null);
        finish();
      }, { once: true });
      document.getElementById('calBtn').addEventListener('click', (event) => {
        event.currentTarget.disabled = true;
        document.getElementById('skipCalBtn').disabled = true;
        const clock = document.getElementById('calClock');
        const ring = document.getElementById('calRing');
        event.currentTarget.textContent = t('calSampling');
        calibration.startSample(performance.now());
        function tick(now) {
          const result = detectFaceFrame(el.video);
          const next = calibration.feed(result.inferred && result.freshVideoFrame !== false ? result.categories : null, now, result.eyeGeometry);
          const progress = Math.max(0, Math.min(1, 1 - next.remainingMs / SAMPLE_MS));
          ring.setAttribute('stroke-dashoffset', String(100 * (1 - progress)));
          clock.setAttribute('aria-valuenow', String(Math.round(progress * 100)));
          setSubtitle(t('calProgress', { s: (next.remainingMs / 1000).toFixed(1) }));
          if (next.sampling) requestAnimationFrame(tick);
          else requestAnimationFrame(() => {
            const captured = !next.error && next.lastSample && next.lastSample.key === status.step.key;
            if (captured && TRIALS[status.step.key]) {
              renderTrial(next, () => render(calibration.snapshot()));
            } else {
              render(next);
            }
          });
        }
        requestAnimationFrame(tick);
      }, { once: true });
    }
    // A re-render mid-sample would detach the progress ring, so only idle steps rebuild.
    rerenderOverlay = () => {
      if (trialRerender) { trialRerender(); return; }
      const status = calibration.snapshot();
      if (!status.sampling) render(status);
    };
    try {
      await new Promise((done) => { finish = done; render(calibration.snapshot()); });
    } finally {
      rerenderOverlay = null;
      trialRerender = null;
    }
  }

  // --- round flow ----------------------------------------------------------
  let roundToken = 0;
  function startRound() {
    const token = ++roundToken;
    state.round += 1;
    eyeHold.reset();
    setAmbient(null); // each serve clears the previous round's feedback glow
    state.closedSince = 0; // each serve starts a fresh eyes-shut hold
    state.item = randomItem();
    // Hold the spoon and the timer until this dish is actually decoded. On a
    // slow hosted site, setting src alone leaves the previous picture on
    // screen while the new round already runs, so image and judgement drift.
    state.phase = 'loading';
    el.spoon.style.opacity = '0';
    el.spoon.style.transform = 'translate(-74%, -70%) scale(2)';
    preloadImage(state.item.image).then(() => {
      if (token !== roundToken) return; // a newer round superseded this one
      el.item.src = state.item.image;
      el.item.alt = foodText(state.item, getLanguage()).name;
      const speed = speedForLevel(state.level);
      state.phase = 'serving';
      state.phaseStart = performance.now();
      state.phaseDuration = state.cthulhu ? FRENZY_TRAVEL_MS : speed.travelMs;
      if (state.cthulhu) {
        setSubtitle(t('cthulhuChant')); // the only line the frenzy allows
        return;
      }
      const itemText = foodText(state.item, getLanguage());
      const nurseLines = t('nurseLines');
      setSubtitle(itemText.line || nurseLines[state.round % nurseLines.length]);
      // Warm a few random dishes so later rounds are usually instant.
      prefetchImages(Array.from({ length: 3 }, () => randomItem().image));
    });
  }

  function enterCthulhu() {
    if (state.cthulhu) return;
    state.cthulhu = true;
    state.cthulhuExitAt = 0;
    state.score = -2147483647;
    state.discomfort = SCORING.MAX_DISCOMFORT;
    setScore();
    setDiscomfort();
    el.bg.src = GLITCH_PHOTO;
    document.body.classList.add('cthulhu-mode');
    sfx.stopAll(); // the frenzy silences feeding cues
    setAmbient(null); // the frenzy replaces all normal feeding feedback
    setSubtitle(t('cthulhuChant'));
  }

  function resolveServe() {
    // Invincible: the badge still shows the face, but nothing the player does
    // can score, hurt, rescue or otherwise change the run any more.
    if (state.cthulhu) {
      state.phase = 'result';
      state.phaseStart = performance.now();
      state.phaseDuration = FRENZY_RESULT_MS;
      setSubtitle(t('cthulhuChant'));
      return;
    }
    const outcome = judge(state.item, state.lastIntent);
    const before = state.discomfort;
    state.score += outcome.scoreDelta;
    state.discomfort = Math.max(0, Math.min(SCORING.MAX_DISCOMFORT, state.discomfort + outcome.discomfortDelta));
    recordServe(state.stats, {
      item: state.item,
      intent: state.lastIntent,
      outcome,
      appliedDiscomfort: state.discomfort - before, // clamped delta, not the nominal one
      faceLost: state.lastFaceLost,
    });
    setScore();
    setDiscomfort();
    sfx.onServe(outcome.type); // bite sound; a swallowed object starts the rescue buzz

    // Correct plays AND eye-defense both accelerate the game (level up).
    if (outcome.type === OUTCOME.CORRECT_ACCEPT || outcome.type === OUTCOME.CORRECT_REJECT || outcome.type === OUTCOME.SURREAL_ACCEPT || outcome.type === OUTCOME.DEFENDED) {
      state.level += 1;
    } else if (outcome.type === OUTCOME.WRONG_EAT) {
      state.level = Math.max(0, state.level - 1);
    }
    // Combo is a pure rule: surreal food keeps the streak on both acceptance
    // and refusal, without scoring or accelerating on the refusal.
    const previousCombo = state.combo;
    state.combo = comboContinues(outcome) ? state.combo + 1 : 0;
    const comboBonus = comboScoreBonus(previousCombo, state.combo);
    if (comboBonus) {
      state.score += comboBonus;
      // Combo points are earned by eating, so they count as eating score too
      // (the Glutton ending uses eatScore / total score).
      state.stats.eatScore += comboBonus;
      setScore();
    }
    setCombo();

    // Six consecutive eyes-shut or no-face rounds do NOT end the run: they
    // unleash the invincible frenzy, which ends only after the player leaves
    // that state for five seconds.
    if (state.stats.defenseStreak >= CTHULHU_STREAK) {
      enterCthulhu();
      state.phase = 'result';
      state.phaseStart = performance.now();
      state.phaseDuration = FRENZY_RESULT_MS;
      setSubtitle(t('cthulhuChant'));
      return;
    }

    if (outcome.type === OUTCOME.WRONG_EAT) {
      state.wrongEats += 1;
      state.failShot = captureFrame(); // grab the face at the moment of failure
      setAmbient('rescue'); // flashing yellow for the whole vomit window
      state.phase = 'rescue';
      state.rescueResolved = false;
      state.phaseStart = performance.now();
      state.phaseDuration = RESCUE_MS;
      setSubtitle(t('wrongBite'));
      return;
    }
    flashResult(outcome);
  }

  function flashResult(outcome) {
    setAmbient(feedbackTone(outcome.type)); // good/neutral green, surreal yellow
    let msg;
    if (outcome.type === OUTCOME.DEFENDED) {
      // Nurse nags you for shutting your eyes instead of eating -- rotate lines.
      const lines = t('defenseLines');
      msg = lines[Math.floor(Math.random() * lines.length)];
    } else {
      msg = {
        [OUTCOME.CORRECT_ACCEPT]: t('outcomeSwallowed'),
        [OUTCOME.CORRECT_REJECT]: t('outcomeRejected'),
        [OUTCOME.SURREAL_ACCEPT]: t('outcomeSurreal', { n: SCORING.SURREAL_POINTS }),
        [OUTCOME.SURREAL_REJECT]: t('outcomeSurrealReject'),
        [OUTCOME.DECLINED_FOOD]: t('outcomeDeclined'),
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
    recordRescue(state.stats, state.discomfort - before);
    setDiscomfort();
    sfx.onRescue(success); // stop buzz; vomit sound or wrong-eat sound
    // Object rejected -> green; object finally swallowed -> red.
    setAmbient(success ? 'green' : 'red');
    setSubtitle(success ? t('rescueUp', { n: before - state.discomfort }) : t('rescueHeld'));
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
      settleSeconds: null,
      wrongEats: 0,
      combo: 0,
      lastCategories: null,
      lastFaceAt: 0,
      failShot: null,
      maxCombo: 0,
      closedSince: 0,
      stats: createResultStats(),
      cthulhu: false,
      cthulhuExitAt: 0,
      lastFaceLost: false,
    });
    el.bg.src = 'assets/bg.jpg';
    document.body.classList.remove('cthulhu-mode');
    sfx.stopAll();
    setAmbient(null);
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

  function loadCardPicture(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  async function gameOver() {
    state.phase = 'gameover';
    roundToken += 1; // invalidate any dish still decoding from the last round
    sfx.stopAll(); // no feeding cue stuck on the result screen
    setAmbient(null); // no feeding glow on the result screen
    const seconds = state.settleSeconds ?? (state.settleSeconds = Math.round((performance.now() - state.startTime) / 1000));
    if (!state.failShot) state.failShot = captureFrame(); // fallback grab if no prior fail
    const resultKey = determineResult(state, state.stats, seconds);
    const resultTitle = t(`result.${resultKey}`);
    // Three endings replace the failure snapshot with a fixed picture.
    const fixed = RESULT_PHOTO[resultKey];
    const photo = fixed ? (await loadCardPicture(fixed)) || state.failShot : state.failShot;
    const card = buildResultCard(photo, {
      score: state.score,
      seconds,
      wrongEats: state.wrongEats,
      maxCombo: state.maxCombo,
      resultTitle,
    });
    const cardUrl = card.toDataURL('image/png');
    showOverlay(
      `<h1>${resultTitle}</h1>` +
      `<p class="result-hint">${t(`resultHint.${resultKey}`)}</p>` +
      `<img id="resultCard" class="result-card" src="${cardUrl}" alt="${t('resultCardAlt')}">` +
      `<div class="card-actions${isDemo ? '' : ' two-up'}">` +
      `<button id="againBtn" type="button" title="${t('playAgainTitle')}">${t('playAgain')}</button>` +
      (isDemo ? '' : `<button id="newPlayerBtn" type="button" title="${t('newPlayerTitle')}">${t('newPlayer')}</button>`) +
      `</div>` +
      `<div class="card-actions save-row">` +
      `<button id="saveCardBtn" type="button">${t('saveCard')}</button>` +
      `</div>` +
      `<p class="share-note">${t('shareNote')}</p>`,
      resultKey === RESULT.CTHULHU ? 'gameover-panel glitch-panel' : 'gameover-panel'
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

  // Compose a portrait share card: the failure frame (or a fixed ending image)
  // behind a dark scrim, with the game name and a stat block. Returns a canvas
  // ready to download.
  function buildResultCard(photo, s) {
    const W = 720;
    const H = 1080;
    const card = document.createElement('canvas');
    card.width = W;
    card.height = H;
    const ctx = card.getContext('2d');
    ctx.fillStyle = '#162a29';
    ctx.fillRect(0, 0, W, H);
    if (photo) {
      const w = photo.naturalWidth || photo.width || W;
      const h = photo.naturalHeight || photo.height || H;
      const scale = Math.max(W / w, H / h);
      const dw = w * scale;
      const dh = h * scale;
      ctx.drawImage(photo, (W - dw) / 2, (H - dh) / 2, dw, dh);
      ctx.fillStyle = 'rgba(10,20,20,0.55)';
      ctx.fillRect(0, 0, W, H);
    }
    // Same pixel typefaces as the on-screen UI: Press Start 2P for the
    // heading, VT323 for the rest of the card. The card is displayed at ~0.5x,
    // so the canvas type needs to be about twice the on-screen target.
    ctx.textAlign = 'center';
    // One-line game name, enlarged. Both languages are scaled to the same
    // measured glyph height so 中/EN look equally big; uppercasing keeps the
    // English pixel-heading style. appTitle is the start screen's own name.
    ctx.fillStyle = '#f3b66c';
    const title = t('appTitle').toUpperCase();
    ctx.font = '700 42px "Press Start 2P", "Fusion Pixel 12", monospace';
    const titleMetrics = ctx.measureText(title);
    const titleGlyph = (titleMetrics.actualBoundingBoxAscent ?? 42)
      + (titleMetrics.actualBoundingBoxDescent ?? 0);
    // Chinese has only four glyphs and stays well inside the card width, so
    // it can take a taller target; English is already width-limited.
    const targetGlyph = getLanguage() === 'zh' ? 88 : 60;
    const titleSize = Math.round((42 * targetGlyph) / titleGlyph);
    ctx.font = `700 ${titleSize}px "Press Start 2P", "Fusion Pixel 12", monospace`;
    const titleScale = titleSize / 42;
    const titleBaseline = 140 + ((titleMetrics.actualBoundingBoxAscent ?? 42)
      - (titleMetrics.actualBoundingBoxDescent ?? 0)) / 2 * titleScale;
    ctx.fillText(title, W / 2, titleBaseline, W - 120);
    // Hierarchy: game name > the actual ending > the "Feeding Results" label.
    ctx.fillStyle = '#d8d2c0';
    ctx.font = '700 46px "VT323", "Fusion Pixel 12", monospace';
    ctx.fillText(t('cardResultsTitle'), W / 2, 224, W - 120);
    ctx.fillStyle = '#f3b66c'; // same gold as the game name
    ctx.font = '700 72px "VT323", "Fusion Pixel 12", monospace';
    ctx.fillText(s.resultTitle, W / 2, 310, W - 120);
    // A "final discomfort" row would carry little information: most runs end
    // at 100, while the six-blink ending stops early.
    const luckyField = sixtySevenField({ score: s.score, seconds: s.seconds, maxCombo: s.maxCombo });
    const rows = [
      ['score', t('cardScore'), String(s.score)],
      ['seconds', t('cardSurvived'), t('cardSeconds', { n: s.seconds })],
      ['badBites', t('cardBadBites'), String(s.wrongEats)],
      ['maxCombo', t('cardMaxCombo'), `x${s.maxCombo}`],
    ];
    ctx.textAlign = 'left';
    let y = 400;
    for (const [field, k, v] of rows) {
      // The rare 67 ending spotlights whichever headline stat hit the number:
      // bigger, red, and underlined so it is obvious at a glance.
      const lucky = field === luckyField;
      ctx.font = lucky
        ? '700 68px "VT323", "Fusion Pixel 12", monospace'
        : '600 50px "VT323", "Fusion Pixel 12", monospace';
      ctx.fillStyle = lucky ? '#ff4d6d' : '#f5f0df';
      ctx.fillText(k, 90, y, 250);
      ctx.fillStyle = lucky ? '#ff4d6d' : '#f3b66c';
      ctx.textAlign = 'right';
      ctx.fillText(v, W - 90, y, 250);
      if (lucky) {
        const width = Math.min(ctx.measureText(v).width, 250);
        ctx.fillRect(W - 90 - width, y + 14, width, 6);
      }
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
    const hold = eyeHold.update({ inferred: detection.inferred, closed: detection.freshVideoFrame !== false && !!fresh && eyesClosed(fresh, state.thresholds, detection.eyeGeometry), now, durationMs: state.thresholds?.baseline.eyeHoldMs ?? 200 });
    const rawExpr = classifyExpression(face, state.thresholds, state.eyeGeometry);
    const expr = protectedEyeExpression(rawExpr, isDemo || hold.ready);
    setBadge(faceLost ? 'none' : expr);
    state.lastFaceLost = faceLost;
    // Once the player stops shutting their eyes / vanishing for the first time,
    // the frenzy has five seconds left, even if they hide again afterwards.
    if (state.cthulhu && !state.cthulhuExitAt && !faceLost && rawExpr !== EXPRESSIONS.BLINK) {
      state.cthulhuExitAt = now + 5000;
    }

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
        if (!state.cthulhu && state.discomfort >= SCORING.MAX_DISCOMFORT) gameOver();
        else startRound();
      }
    }
    if (state.cthulhu && state.cthulhuExitAt && now >= state.cthulhuExitAt) void gameOver();

    // Game over is decided when a result/feedback phase ends, so a maxed-out
    // rescue still gets to play before the screen switches.
    state.prevExpr = expr;
    // Game Over stops the chain; restartGame() starts exactly one fresh loop.
    if (state.phase !== 'gameover') requestAnimationFrame(loop);
  }

  // --- language switching --------------------------------------------------
  // The 中/EN toggle switches the whole game, including the live HUD.
  onLanguageChange(() => {
    shownExpr = null; // force a badge rebuild in the new language
    if (state.item) el.item.alt = foodText(state.item, getLanguage()).name;
    if (state.combo >= 2) setCombo();
    if (!el.overlay.hidden && state.phase === 'gameover') gameOver();
    else rerenderOverlay?.();
  });

  // --- boot ----------------------------------------------------------------
  try {
    if (isDemo) {
      state.thresholds = { baseline: getBaseline(), profile: null }; // demo bypasses player correction
      hideOverlay();
      setSubtitle(t('demoHint'));
      state.startTime = performance.now();
      startRound();
      requestAnimationFrame(loop);
      return;
    }
    showOverlay(`<h1>${t('appTitle')}</h1><p>${t('loadingCamera')}</p>`);
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
      `<h1>${t('couldNotStart')}</h1><p>${err.message || err}</p>` +
      `<p>${t('cameraHelp')}</p>`
    );
  }
}
