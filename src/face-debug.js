import { createDebugLanguage } from './face-debug-i18n.js';
import { createEyeHold, protectedEyeExpression } from './eye-hold.js';
import { FACE_DESCRIPTIONS as FACE_LABELS, faceLabel } from './face-labels.js';
import { openCamera, initFaceLandmarker, detectFaceFrame, resetFaceTracking } from './face.js';
import { blendshapeScore, closedEyeChecks } from './logic.js';
import {
  FACE_ACTIONS, defaultFaceSettings, validateFaceSettings, analyzeFaceSettings,
  getAppliedFaceSettings, applyFaceSettings, resetFaceSettings, getPlayerProfile, setPlayerProfile, baselineSignature,
} from './face-settings.js';

import { createFaceCalibration } from './face-calibration.js';

const ACTIONS = FACE_ACTIONS;
export const defaultDebugSettings = defaultFaceSettings;
export const validateDebugSettings = validateFaceSettings;

export function analyzeDebugFace(categories, settings, profile = null, geometry = null) {
  const analysis = analyzeFaceSettings(categories, settings, profile, geometry);
  if (!analysis) return null;
  // Eye geometry is a lower-is-closed measurement, not a weighted strength.
  // Exclude it from strength ranking instead of ranking obsolete Blink scores.
  const ranked = ACTIONS.map(([key]) => key).filter((key) => key !== 'blink').sort((a, b) => analysis.weighted[b] - analysis.weighted[a]).slice(0, 3);
  return { ...analysis, ranked };
}

export function createEventLog(limit = 100) {
  const lines = [];
  return {
    add(message, date = new Date()) {
      lines.push(`[${date.toISOString()}] ${message}`);
      if (lines.length > limit) lines.splice(0, lines.length - limit);
      return lines.join('\n');
    },
  };
}

// Dependencies can be replaced in tests without a camera or downloaded model.
export function createDebugSession({
  video, onUpdate, onLog, onCalibration = () => {},
  open = openCamera, init = initFaceLandmarker, detect = detectFaceFrame,
  reset = resetFaceTracking, clock = () => performance.now(),
  requestFrame = (fn) => requestAnimationFrame(fn),
  cancelFrame = (id) => cancelAnimationFrame(id),
}) {
  let settings = defaultDebugSettings();
  let thresholds = settings.thresholds;
  let active = true;
  let stream = null;
  let frame = null;
  let lastRender = -Infinity;
  let expression = 'Waiting';
  let lastResult = null;
  let sampleTimes = [];
  let calibration = null;
  let ready = false;
  let profile = getPlayerProfile(settings);
  let useProfile = !!profile;
  const eyeHold = createEyeHold();
  let hold = { elapsedMs: 0, requiredMs: 500, ready: false };
  const started = clock();

  function stop() {
    if (!active) return;
    active = false;
    ready = false;
    calibration = null;
    onCalibration({ cancelled: true });
    if (frame !== null) cancelFrame(frame);
    if (stream) {
      for (const track of stream.getTracks()) track.stop();
      if (video.srcObject === stream) {
        video.pause();
        video.srcObject = null;
      }
    }
    reset();
  }
  function fail(err) {
    if (!active) return;
    onLog(`ERROR: ${err.message || err}`);
    onUpdate({ status: `Could not run Face Debug: ${err.message || err}`, expression: 'Error', categories: null, thresholds });
    stop();
  }
  function publish(now) {
    const analysis = analyzeDebugFace(lastResult?.categories, settings, useProfile ? profile : null, lastResult?.eyeGeometry);
    const next = lastResult ? protectedEyeExpression(analysis?.expression, hold.ready) || 'No face' : 'Waiting';
    if (next !== expression) {
      onLog(`Recognition: ${faceLabel(expression)} -> ${faceLabel(next)}`);
      expression = next;
    }
    const elapsed = now - started;
    onUpdate({
      status: 'Camera running', expression, thresholds, settings, analysis, profile, useProfile, hold,
      categories: lastResult?.categories || null, eyeGeometry: lastResult?.eyeGeometry,
      durationMs: lastResult?.durationMs, time: lastResult?.wallTime,
      elapsedMs: elapsed,
      fps: sampleTimes.filter((time) => now - time < 1000).length / (Math.min(1000, elapsed) / 1000 || 1),
    });
  }
  function tick() {
    if (!active) return;
    try {
      const result = detect(video);
      const now = clock();
      const frameAnalysis = analyzeDebugFace(result.categories, settings, useProfile ? profile : null, result.eyeGeometry);
      hold = eyeHold.update({ inferred: result.inferred, closed: result.freshVideoFrame !== false && !!frameAnalysis && closedEyeChecks(frameAnalysis.weighted, settings.thresholds).every((c) => c.passed), now, durationMs: settings.eyeHoldMs });
      if (result.inferred) {
        sampleTimes.push(now);
        lastResult = { ...result, wallTime: new Date().toISOString() };
        const next = protectedEyeExpression(frameAnalysis?.expression, hold.ready) || 'No face';
        if (next !== expression) {
          onLog(`Recognition: ${faceLabel(expression)} -> ${faceLabel(next)}`);
          expression = next;
        }
      }
      if (calibration?.snapshot().sampling) {
        const status = calibration.feed(result.inferred && result.freshVideoFrame !== false ? result.categories : null, now, result.eyeGeometry);
        if (!status.sampling) {
          onLog(`Calibration sample: ${JSON.stringify(status.lastSample)}`);
          if (status.error) onLog(`Calibration retry: ${status.error}`);
          if (status.completed) {
            eyeHold.reset();
            profile = status.profile;
            useProfile = true;
            if (profile.signature === baselineSignature(getAppliedFaceSettings() || defaultFaceSettings())) setPlayerProfile(profile);
            onLog(`Player correction: ${JSON.stringify(profile)}`);
          }
        }
        onCalibration(status);
      }
      sampleTimes = sampleTimes.filter((time) => now - time < 1000);
      if (now - lastRender >= 200) {
        publish(now);
        lastRender = now;
      }
      frame = requestFrame(tick);
    } catch (err) {
      fail(err);
    }
  }
  async function start() {
    onLog('Requesting camera permission');
    onUpdate({ status: 'Opening camera…', expression, thresholds });
    try {
      const acquired = await open();
      if (!active) {
        for (const track of acquired.getTracks()) track.stop();
        return;
      }
      stream = acquired;
      video.srcObject = stream;
      for (const track of stream.getTracks()) {
        track.addEventListener('ended', () => fail(new Error('Camera stream ended')), { once: true });
      }
      await video.play();
      if (!active) return;
      onLog('Camera ready; loading face model');
      onUpdate({ status: 'Loading face model…', expression, thresholds });
      const loadStart = clock();
      await init();
      if (!active) return;
      onLog(`Model ready (${(clock() - loadStart).toFixed(1)} ms); detection started`);
      reset();
      ready = true;
      onCalibration({ ready: true });
      frame = requestFrame(tick);
    } catch (err) {
      fail(err);
    }
  }
  function setSettings(next) {
    if (!active) return;
    const validated = validateDebugSettings(next);
    if (baselineSignature(validated) !== baselineSignature(settings)) {
      profile = null; useProfile = false;
      if (calibration) { calibration = null; onCalibration({ cancelled: true, ready }); }
      onLog('Baseline changed: player correction invalidated');
    }
    eyeHold.reset();
    settings = validated;
    thresholds = settings.thresholds;
    onLog(`Debug settings: ${JSON.stringify(settings)}`);
    if (lastResult) publish(clock());
  }
  function startCalibration() {
    if (!active || !ready) return;
    calibration = createFaceCalibration(settings);
    onLog('Calibration started: shared game algorithm; baseline stays unchanged');
    onCalibration(calibration.snapshot());
  }
  function sampleCalibration() {
    if (!active || !ready || !calibration) return;
    onCalibration(calibration.startSample(clock()));
  }
  function cancelCalibration() {
    if (!calibration) return;
    calibration = null;
    onLog('Calibration cancelled; previous settings retained');
    onCalibration({ cancelled: true, ready });
  }
  return { start, stop, setSettings, startCalibration, sampleCalibration, cancelCalibration,
    setProfileMode(enabled) { eyeHold.reset(); useProfile = !!enabled && !!profile; if (lastResult) publish(clock()); },
    commitProfile() { if (profile) setPlayerProfile(profile); },
  };
}

export function updateGameSettingsLabel() {
  const saved = getAppliedFaceSettings();
  const status = document.getElementById('gameSettingsStatus');
  if (status) status.textContent = saved
    ? 'Saved developer baseline + player calibration at game start.'
    : 'Default developer baseline + player calibration at game start.';
  const start = document.getElementById('startBtn');
  if (start) start.textContent = 'Start & Calibrate (needs camera)';
}

export function openFaceDebug() {
  const view = document.getElementById('faceDebug');
  const stage = document.querySelector('.stage');
  const video = document.getElementById('debugCam');
  const get = (id) => document.getElementById(id);
  const log = createEventLog();
  let settings = getAppliedFaceSettings() || defaultDebugSettings();
  let validSettings = true;
  const save = get('debugApply');
  const opennessInput = get('debugEyeOpenness');
  opennessInput.value = String(settings.eyeOpennessLimit ?? .05);
  const holdInput = get('debugEyeHold');
  holdInput.value = String(settings.eyeHoldMs);
  holdInput.hidden = false;
  const stopLanguage = createDebugLanguage(view, get('debugLanguage'));
  const table = get('debugSignals');
  table.replaceChildren();
  const controls = ACTIONS.map(([key, label, threshold]) => {
    const row = document.createElement('tr');
    const cells = Array.from({ length: 9 }, () => document.createElement('td'));
    cells[0].textContent = label;
    const weight = document.createElement('input');
    const limit = document.createElement('input');
    for (const [input, value, max, step, name] of [
      [weight, settings.weights[key], 3, 0.05, `${key} weight`],
      [limit, settings.thresholds[threshold], 1, 'any', `${key} threshold`],
    ]) {
      input.type = 'number'; input.min = '0'; input.max = String(max); input.step = String(step);
      input.value = String(value); input.setAttribute('aria-label', name.replace('frown', 'refusal'));
    }
    if (key === 'blink') {
      weight.disabled = true; limit.disabled = true; weight.hidden = true; limit.hidden = true;
      cells[3].textContent = '—'; cells[5].textContent = 'Eye openness limit';
    }
    cells[3].append(weight); cells[5].append(limit);
    row.append(...cells); table.append(row);
    return { key, label, threshold, row, cells, weight, limit };
  });
  const rawNames = ['leftEAR', 'rightEAR', 'mouthSmileLeft', 'mouthSmileRight', 'mouthFrownLeft', 'mouthFrownRight', 'jawOpen', 'browDownLeft', 'browDownRight', 'browInnerUp', 'browOuterUpLeft', 'browOuterUpRight'];
  const rawTable = get('debugRaw');
  rawTable.replaceChildren();
  const rawCells = rawNames.map((name) => {
    const group = { leftEAR: 'Eyes', mouthSmileLeft: 'Mouth', browDownLeft: 'Brows' }[name];
    if (group) {
      const heading = document.createElement('tr');
      heading.className = 'debug-signal-group';
      const title = document.createElement('th'); title.colSpan = 2; title.textContent = group;
      heading.append(title); rawTable.append(heading);
    }
    const row = document.createElement('tr');
    const label = document.createElement('td'); label.textContent = name === 'leftEAR' ? 'Left eye openness ratio' : name === 'rightEAR' ? 'Right eye openness ratio' : name;
    const value = document.createElement('td'); row.append(label, value); rawTable.append(row);
    return value;
  });
  const resultRows = controls.map(({ key, row, cells }) => ({
    key: key === 'jaw' ? 'vomit' : key === 'frown' ? 'refusal' : key, row, state: cells[7], reason: cells[8],
  }));
  for (const [key, label] of [['neutral', FACE_LABELS.neutral], ['none', FACE_LABELS.none]]) {
    const row = document.createElement('tr');
    const cells = Array.from({ length: 9 }, () => document.createElement('td'));
    cells[0].textContent = label;
    for (let i = 1; i <= 6; i++) cells[i].textContent = '—';
    row.append(...cells); table.append(row);
    resultRows.push({ key, row, state: cells[7], reason: cells[8] });
  }
  get('debugLog').textContent = '';
  for (const id of ['debugExpression', 'debugDuration', 'debugFps', 'debugTime']) get(id).textContent = '—';
  get('debugElapsed').textContent = '0.0 s';
  stage.hidden = true;
  view.hidden = false;
  const calibrate = get('debugCalibrate');
  const sample = get('debugCalSample');
  const cancel = get('debugCalCancel');
  calibrate.disabled = true;
  sample.hidden = true;
  cancel.hidden = true;
  get('debugCalStatus').textContent = 'Waiting for camera and model';
  const session = createDebugSession({
    video,
    onCalibration(status) {
      const running = !!status.step && !status.completed && !status.cancelled;
      calibrate.disabled = running || (!status.ready && !status.completed && !status.cancelled);
      for (const { key, weight, limit } of controls) { weight.disabled = running || key === 'blink'; limit.disabled = running || key === 'blink'; }
      holdInput.disabled = running;
      opennessInput.disabled = running;
      save.disabled = running || !validSettings;
      get('debugReset').disabled = running;
      sample.hidden = !running;
      const image = get('debugCalImage');
      image.hidden = !running;
      if (running) {
        image.src = status.step.image;
        image.alt = status.step.imageAlt;
      }
      sample.disabled = !!status.sampling;
      cancel.hidden = !running;
      if (status.completed) {
        get('debugCalStatus').textContent = 'Player correction complete. Baseline unchanged; corrected preview enabled.';
        get('debugSettingStatus').textContent = 'Player correction is session-only. Save baseline separately if edited.';
      } else if (running) {
        get('debugCalStatus').textContent = `${status.step.title} — ${status.sampling ? `Sampling ${(status.remainingMs / 1000).toFixed(1)} s` : status.error || status.step.hint}`;
      } else {
        get('debugCalStatus').textContent = status.cancelled ? 'Calibration stopped.' : 'Ready for five-step game calibration (1.5 s per step).';
        if (status.cancelled && !status.ready) calibrate.disabled = true;
      }
    },
    onLog(message) {
      const output = get('debugLog');
      output.textContent = log.add(message);
      output.scrollTop = output.scrollHeight;
    },
    onUpdate(data) {
      get('debugStatus').textContent = data.status;
      get('debugExpression').textContent = faceLabel(data.expression);
      get('debugDuration').textContent = data.durationMs == null ? '—' : `${data.durationMs.toFixed(1)} ms`;
      get('debugFps').textContent = data.fps == null ? '—' : data.fps.toFixed(1);
      get('debugElapsed').textContent = `${((data.elapsedMs || 0) / 1000).toFixed(1)} s`;
      get('debugTime').textContent = data.time || '—';
      const analysis = data.analysis;
      get('debugEyeProgress').textContent = data.hold ? `${data.hold.elapsedMs.toFixed(0)} / ${data.hold.requiredMs} ms` : '—';
      const mode = get('debugProfileMode');
      mode.options[1].disabled = !data.profile;
      mode.value = data.useProfile ? 'player' : 'baseline';
      get('debugProfile').textContent = data.profile ? JSON.stringify(Object.fromEntries(Object.entries(data.profile.channels).map(([key, value]) => [faceLabel(key === 'frown' ? 'refusal' : key === 'jaw' ? 'vomit' : key), value])), null, 2) : 'No compatible player correction. Calibrate to compare.';
      const f = (value) => value.toFixed(3);
      for (const { key, label, row, cells } of controls) {
        const rank = analysis ? analysis.ranked.indexOf(key) + 1 : 0;
        row.dataset.rank = rank > 0 ? String(rank) : '';
        cells[0].textContent = `${rank > 0 ? '#' + rank + ' ' : ''}${label}`;
        cells[1].textContent = analysis ? f(analysis.raw[key]) : '—';
        cells[2].textContent = analysis ? f(analysis.corrected[key]) : '—';
        cells[4].textContent = analysis ? f(analysis.weighted[key]) : '—';
        const thresholdKey = ACTIONS.find(([name]) => name === key)[2];
        cells[6].textContent = analysis ? (key === 'blink' ? closedEyeChecks(analysis.weighted, settings.thresholds).every((c) => c.passed) : analysis.weighted[key] >= settings.thresholds[thresholdKey]) ? 'PASS' : 'BELOW' : '—';
        if (key === 'blink') {
          const eyes = data.eyeGeometry;
          cells[1].textContent = eyes ? `${f(eyes.left)} / ${f(eyes.right)}` : '—';
          cells[2].textContent = '—'; cells[4].textContent = '—';
        }
      }
      rawCells.forEach((cell, i) => {
        const name = rawNames[i];
        const geometric = name === 'leftEAR' ? 'left' : name === 'rightEAR' ? 'right' : null;
        const signal = geometric ? (data.eyeGeometry ? { score: data.eyeGeometry[geometric] } : null) : data.categories?.find((c) => c.categoryName === name);
        cell.textContent = signal ? f(signal.score) : data.categories ? 'NOT OUTPUT' : '—';
      });
      for (const { key, row, state, reason } of resultRows) {
        const candidate = analysis?.candidates.find((c) => c.expression === key);
        const noFace = data.expression === 'No face';
        const pendingHold = key === 'blink' && candidate?.selected && !data.hold?.ready;
        const selected = key === 'none' ? noFace : key === data.expression;
        row.dataset.selected = String(selected);
        state.textContent = selected ? 'SELECTED' : candidate?.blockedBy ? 'OVERRIDDEN' : candidate ? 'NOT SELECTED' : '—';
        if (key === 'none') reason.textContent = noFace ? 'Inference found no face' : analysis ? 'Face detected' : data.status;
        else if (!candidate) reason.textContent = noFace ? 'Not evaluated: no face' : 'Waiting for a valid detection';
        else if (key === 'neutral') reason.textContent = selected ? (analysis.expression === 'blink' ? 'Blink protect time not reached' : 'No action satisfies all its conditions') : `Action selected: ${faceLabel(analysis.expression)}`;
        else {
          const checks = candidate.checks.map((c) => `${c.passed ? 'PASS' : 'FAIL'} ${c.label}: ${f(c.left)} ${c.operator} ${f(c.right)}`).join('; ');
          reason.textContent = checks + (key === 'blink' && data.hold ? `; hold ${data.hold.elapsedMs.toFixed(0)} / ${data.hold.requiredMs} ms` : '') + (candidate.blockedBy ? `; overridden by ${faceLabel(candidate.blockedBy)}` : '');
        }
      }
    },
  });
  function updateSettings() {
    const next = defaultDebugSettings();
    for (const { key, threshold, weight, limit } of controls) {
      if (!weight.checkValidity() || !limit.checkValidity() || weight.value === '' || limit.value === '') {
        validSettings = false;
        save.disabled = true;
        get('debugSettingStatus').textContent = 'Enter a weight from 0 to 3 and a threshold from 0 to 1.';
        return;
      }
      next.weights[key] = weight.valueAsNumber;
      next.thresholds[threshold] = limit.valueAsNumber;
    }
    if (!holdInput.checkValidity() || holdInput.value === '') {
      validSettings = false; save.disabled = true;
      get('debugSettingStatus').textContent = 'Blink protect time must be 200–1500 ms.';
      return;
    }
    if (!opennessInput.checkValidity() || opennessInput.value === '') { validSettings = false; save.disabled = true; return; }
    next.eyeOpennessLimit = opennessInput.valueAsNumber;
    next.eyeHoldMs = holdInput.valueAsNumber;
    settings = validateDebugSettings(next);
    validSettings = true;
    save.disabled = false;
    get('debugSettingStatus').textContent = 'Preview changed — click Apply to game to use these parameters in the game.';
    session.setSettings(settings);
  }
  for (const { weight, limit } of controls) {
    weight.addEventListener('input', updateSettings);
    limit.addEventListener('input', updateSettings);
  }
  opennessInput.addEventListener('input', updateSettings);
  holdInput.addEventListener('input', updateSettings);
  function apply() {
    if (!validSettings) return;
    const persisted = applyFaceSettings(settings);
    get('debugSettingStatus').textContent = persisted
      ? 'Applied to game and saved on this browser. Player calibration still runs at game start.'
      : 'Applied to game for this page. Storage unavailable: refresh will lose settings.';
    get('debugLog').textContent = log.add(`Applied to game; persisted=${persisted}`);
    session.commitProfile();
    updateGameSettingsLabel();
  }
  save.addEventListener('click', apply);
  const reset = get('debugReset');
  function restore() {
    resetFaceSettings();
    validSettings = true;
    save.disabled = false;
    settings = defaultDebugSettings();
    holdInput.value = String(settings.eyeHoldMs);
    opennessInput.value = String(settings.eyeOpennessLimit);
    for (const { threshold, weight, limit } of controls) {
      weight.value = '1'; limit.value = String(settings.thresholds[threshold]);
    }
    session.setSettings(settings);
    get('debugSettingStatus').textContent = 'Default developer baseline restored. Player correction cleared; recalibrate.';
    updateGameSettingsLabel();
  }
  reset.addEventListener('click', restore);
  session.setSettings(settings);
  get('debugSettingStatus').textContent = getAppliedFaceSettings()
    ? 'Loaded developer baseline. Player correction is separate.'
    : 'Default developer baseline. Player calibration runs when starting the game.';
  const beginCalibration = () => session.startCalibration();
  const takeSample = () => session.sampleCalibration();
  const cancelSampling = () => session.cancelCalibration();
  calibrate.addEventListener('click', beginCalibration);
  sample.addEventListener('click', takeSample);
  cancel.addEventListener('click', cancelSampling);
  const mode = get('debugProfileMode');
  const changeMode = () => session.setProfileMode(mode.value === 'player');
  mode.addEventListener('change', changeMode);
  const back = get('debugBack');
  function close() {
    mode.removeEventListener('change', changeMode);
    session.stop();
    stopLanguage();
    view.hidden = true;
    stage.hidden = false;
    for (const { weight, limit } of controls) {
      weight.removeEventListener('input', updateSettings);
      limit.removeEventListener('input', updateSettings);
    }
    reset.removeEventListener('click', restore);
    save.removeEventListener('click', apply);
    opennessInput.removeEventListener('input', updateSettings);
    holdInput.removeEventListener('input', updateSettings);
    calibrate.removeEventListener('click', beginCalibration);
    sample.removeEventListener('click', takeSample);
    cancel.removeEventListener('click', cancelSampling);
    back.removeEventListener('click', close);
    window.removeEventListener('pagehide', close);
  }
  back.addEventListener('click', close);
  window.addEventListener('pagehide', close);
  void session.start();
  return close;
}
