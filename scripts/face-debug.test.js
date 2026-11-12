import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFaceSampler } from '../src/face.js';
import { createDebugSession, createEventLog, defaultDebugSettings, validateDebugSettings, analyzeDebugFace } from '../src/face-debug.js';
import { classifyExpression, evaluateExpression } from '../src/logic.js';

const categories = [{ categoryName: 'jawOpen', score: 0 }];
const cats = (values) => Object.entries(values).map(([categoryName, score]) => ({ categoryName, score }));

test('debug calibration collects fresh frames and preserves baseline weights', async () => {
  const statuses = [];
  const base = { mouthSmileLeft: 0, mouthSmileRight: 0, mouthFrownLeft: 0, mouthFrownRight: 0, mouthPressLeft: 0, mouthPressRight: 0, jawOpen: 0, eyeBlinkLeft: 0, eyeBlinkRight: 0, browDownLeft: 0, browDownRight: 0 };
  let pose = {};
  const h = harness({ onCalibration: (s) => statuses.push(s), detect: () => ({ inferred: true, categories: cats({ ...base, ...pose }), eyeGeometry: { left: pose.eyeBlinkLeft ? .03 : .3, right: pose.eyeBlinkRight ? .03 : .3 }, durationMs: 2 }) });
  await h.session.start();
  const settings = defaultDebugSettings(); settings.weights.smile = 1.2;
  h.session.setSettings(settings);
  h.session.startCalibration();
  const poses = [{}, { mouthSmileLeft: .4, mouthSmileRight: .4 }, { mouthFrownLeft: .2, mouthFrownRight: .2 }, { jawOpen: .5 }, { eyeBlinkLeft: .6, eyeBlinkRight: .6 }];
  poses.forEach((p, i) => {
    pose = p; h.session.sampleCalibration();
    for (let t = 50; t <= 1500; t += 50) h.advance(i * 1500 + t);
  });
  assert.equal(statuses.at(-1).completed, true);
  assert.equal(h.updates.at(-1).settings.weights.smile, 1.2);
  assert.ok(h.logs.some((line) => line.includes('Player correction:')));
  h.session.setProfileMode(false);
  assert.equal(h.updates.at(-1).analysis.profileApplied, false);
  h.session.setProfileMode(true);
  assert.equal(h.updates.at(-1).analysis.profileApplied, true);
  h.session.stop();
});

test('debug weights change aggregate signals without changing the game', () => {
  const c = cats({ mouthSmileLeft: 0.2, mouthSmileRight: 0.2 });
  const settings = defaultDebugSettings();
  assert.equal(analyzeDebugFace(c, settings).expression, classifyExpression(c, settings.thresholds));
  settings.weights.smile = 2;
  assert.equal(analyzeDebugFace(c, settings).expression, 'smile');
  assert.equal(classifyExpression(c, settings.thresholds), 'neutral');
  settings.weights.smile = 0;
  assert.equal(analyzeDebugFace(c, settings).weighted.smile, 0);
  assert.equal(analyzeDebugFace(null, settings), null);
  settings.weights.smile = NaN;
  assert.throws(() => validateDebugSettings(settings));
});

test('all candidates explain priority and smile/refusal conflict', () => {
  const t = defaultDebugSettings().thresholds;
  const a = evaluateExpression({ jaw: 0.9, blink: 0.8, eyeOpenness: { left: .03, right: .03 }, eyeOpennessLimit: .05, smile: 0.7, frown: 0.1 }, t);
  assert.equal(a.expression, 'vomit');
  assert.equal(a.candidates.find((c) => c.expression === 'blink').blockedBy, 'vomit');
  const b = evaluateExpression({ jaw: 0, blink: 0, smile: 0.3, frown: 0.4 }, t);
  assert.equal(b.expression, 'neutral');
  assert.equal(b.candidates.find((c) => c.expression === 'refusal').checks[1].passed, false);
  assert.equal(b.candidates.find((c) => c.expression === 'smile').checks[1].passed, false);
});

test('rank is stable, uses weighted values and permits scores above one', () => {
  const settings = defaultDebugSettings();
  const zero = analyzeDebugFace(cats({}), settings);
  assert.deepEqual(zero.ranked, ['smile', 'frown', 'jaw']);
  settings.weights.frown = 3;
  const a = analyzeDebugFace(cats({ mouthFrownLeft: 1, mouthFrownRight: 1 }), settings);
  assert.equal(a.raw.frown, 1);
  assert.equal(a.weighted.frown, 3);
  assert.equal(a.ranked[0], 'frown');
});

test('settings update recomputes cached detection without another inference', async () => {
  let calls = 0;
  const h = harness({ detect: () => { calls++; return { inferred: true, categories: cats({ jawOpen: 0.3 }), durationMs: 4 }; } });
  await h.session.start();
  h.advance(200);
  const before = h.updates.at(-1);
  const settings = defaultDebugSettings(); settings.thresholds.vomitJawOpen = 0.2;
  h.session.setSettings(settings);
  assert.equal(h.updates.at(-1).expression, 'vomit');
  assert.equal(h.updates.at(-1).fps, before.fps);
  assert.equal(h.updates.at(-1).time, before.time);
  assert.equal(calls, 1);
  h.session.setSettings(defaultDebugSettings());
  assert.equal(h.updates.at(-1).expression, 'neutral');
  h.session.stop();
});

test('sampler distinguishes skipped frames, no face and actual inference time', () => {
  let now = 100;
  let calls = 0;
  const model = { detectForVideo() { calls++; now += 4; return { faceBlendshapes: [] }; } };
  const sampler = createFaceSampler(() => model, () => now);
  const video = { readyState: 2, currentTime: 0 };
  assert.deepEqual(sampler.detect(video), { inferred: true, freshVideoFrame: true, eyeGeometry: null, categories: null, durationMs: 4, timestamp: 100 });
  assert.deepEqual(sampler.detect(video), { inferred: false });
  now = 301;
  assert.equal(sampler.detect(video).inferred, true); // stalled-video fallback
  sampler.reset();
  assert.equal(sampler.detect(video).inferred, true);
  assert.equal(sampler.detect({ ...video }).inferred, true); // a new video session
  assert.equal(calls, 4);
  assert.deepEqual(sampler.detect({ readyState: 1 }), { inferred: false });
});

test('sampler returns supported model categories', () => {
  const sampler = createFaceSampler(() => ({ detectForVideo: () => ({ faceBlendshapes: [{ categories }] }) }));
  assert.equal(sampler.detect({ readyState: 2, currentTime: 0 }).categories, categories);
});

test('timestamped log retains only the last 100 events', () => {
  const log = createEventLog();
  let output;
  for (let i = 0; i < 105; i++) output = log.add(`event ${i}`, new Date('2026-11-12T10:00:00Z'));
  assert.equal(output.split('\n').length, 100);
  assert.match(output.split('\n')[0], /^\[2026-11-12T10:00:00.000Z\] event 5$/);
  assert.match(output, /event 104$/);
});

function harness(overrides = {}) {
  let now = 0;
  let tick;
  let stopped = 0;
  let cancelled = 0;
  const updates = [];
  const logs = [];
  const track = { stop() { stopped++; }, addEventListener() {} };
  const stream = { getTracks: () => [track] };
  const video = { srcObject: null, play: async () => {}, pause() {} };
  const session = createDebugSession({
    video, onUpdate: (data) => updates.push(data), onLog: (line) => logs.push(line),
    open: async () => stream, init: async () => {}, reset() {},
    detect: () => ({ inferred: true, categories, durationMs: 3 }),
    clock: () => now,
    requestFrame(fn) { tick = fn; return 1; },
    cancelFrame() { cancelled++; },
    ...overrides,
  });
  return {
    session, video, stream, updates, logs,
    advance(time) { now = time; tick(); },
    get stopped() { return stopped; }, get cancelled() { return cancelled; },
  };
}

test('debug uses real inference FPS and distinguishes neutral from no face', async () => {
  let result = { inferred: true, categories, durationMs: 3 };
  const h = harness({ detect: () => result });
  await h.session.start();
  h.advance(200);
  assert.equal(h.updates.at(-1).expression, 'neutral');
  assert.equal(h.updates.at(-1).fps, 5);
  result = { inferred: false };
  h.advance(400);
  assert.equal(h.updates.at(-1).expression, 'neutral');
  assert.equal(h.updates.at(-1).fps, 2.5); // skipped call is not an inference
  result = { inferred: true, categories: null, durationMs: 2 };
  h.advance(600);
  assert.equal(h.updates.at(-1).expression, 'No face');
  assert.equal(h.updates.at(-1).categories, null);
  assert.equal(h.updates.at(-1).fps, 2 / 0.6); // no-face inference counts
  h.session.stop();
  h.session.stop();
  assert.equal(h.stopped, 1);
  assert.equal(h.cancelled, 1);
  assert.equal(h.video.srcObject, null);
});

test('leaving before camera permission resolves stops the late stream', async () => {
  let resolveCamera;
  const h = harness({ open: () => new Promise((resolve) => { resolveCamera = resolve; }) });
  const starting = h.session.start();
  h.session.stop();
  resolveCamera(h.stream);
  await starting;
  assert.equal(h.stopped, 1);
  assert.equal(h.video.srcObject, null);
  assert.equal(h.logs.some((line) => line.includes('detection started')), false);
});

test('model failure releases the camera and reports the error', async () => {
  const h = harness({ init: async () => { throw new Error('Model unavailable'); } });
  await h.session.start();
  assert.equal(h.stopped, 1);
  assert.equal(h.video.srcObject, null);
  assert.match(h.updates.at(-1).status, /Model unavailable/);
});

test('leaving while model loads prevents a late detection loop', async () => {
  let resolveModel;
  const h = harness({ init: () => new Promise((resolve) => { resolveModel = resolve; }) });
  const starting = h.session.start();
  await Promise.resolve();
  await Promise.resolve();
  h.session.stop();
  resolveModel();
  await starting;
  assert.equal(h.stopped, 1);
  assert.equal(h.logs.some((line) => line.includes('detection started')), false);
});
