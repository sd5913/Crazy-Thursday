import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFaceCalibration } from '../src/face-calibration.js';
import { defaultFaceSettings, analyzeFaceSettings, applyFaceSettings, resetFaceSettings, setPlayerProfile, getPlayerProfile } from '../src/face-settings.js';

const base = { mouthSmileLeft: 0, mouthSmileRight: 0, mouthFrownLeft: 0, mouthFrownRight: 0, mouthPressLeft: 0, mouthPressRight: 0, jawOpen: 0, eyeBlinkLeft: 0, eyeBlinkRight: 0, browDownLeft: 0, browDownRight: 0 };
const cats = (values = {}) => Object.entries({ ...base, ...values }).map(([categoryName, score]) => ({ categoryName, score }));
const poses = [{}, { mouthSmileLeft: .4, mouthSmileRight: .4 }, { mouthFrownLeft: .2, mouthFrownRight: .2 }, { jawOpen: .5 }, { eyeBlinkLeft: .6, eyeBlinkRight: .6 }];
function feed(cal, pose, start) {
  cal.startSample(start);
  let result;
  for (let t = 0; t <= 1500; t += 50) result = cal.feed(cats(pose), start + t, { left: pose.eyeBlinkLeft ? .03 : .3, right: pose.eyeBlinkRight ? .03 : .3 });
  return result;
}

test('shared calibration creates bounded profile without changing developer baseline', () => {
  const baseline = defaultFaceSettings(); baseline.weights.smile = 1.2;
  const original = JSON.stringify(baseline);
  const cal = createFaceCalibration(baseline);
  let result;
  poses.forEach((pose, i) => { result = feed(cal, pose, i * 2000); });
  assert.equal(result.completed, true);
  assert.equal(JSON.stringify(baseline), original);
  assert.equal(result.profile.channels.smile.gain, 1.25);
  assert.equal(result.profile.channels.smile.compensationPercent, 25);
  assert.equal(result.profile.channels.smile.neutral, 0);
  const raw = cats({ mouthSmileLeft: .2, mouthSmileRight: .2 });
  assert.equal(analyzeFaceSettings(raw, baseline).expression, 'neutral');
  assert.equal(analyzeFaceSettings(raw, baseline, result.profile).expression, 'smile');
});

test('invalid samples and weak poses retry; warmup and outlier do not define profile', () => {
  const cal = createFaceCalibration();
  cal.startSample(0);
  let result = cal.feed(null, 1500);
  assert.match(result.error, /Not enough/);
  result = feed(cal, {}, 2000);
  assert.equal(result.index, 1);
  result = feed(cal, {}, 4000);
  assert.match(result.error, /not distinct/);
  cal.startSample(6000);
  cal.feed(cats({ mouthSmileLeft: 1, mouthSmileRight: 1 }), 6050);
  for (let t = 250; t <= 1500; t += 50) result = cal.feed(cats({ mouthSmileLeft: .4, mouthSmileRight: .4 }), 6000 + t, { left: .3, right: .3 });
  assert.equal(result.lastSample.stats.smile.p75, .4);
  assert.equal(result.index, 2);
});

test('profile is session-only, signature-bound, and same baseline save retains it', () => {
  resetFaceSettings();
  const baseline = defaultFaceSettings();
  const cal = createFaceCalibration(baseline);
  let result; poses.forEach((pose, i) => { result = feed(cal, pose, i * 2000); });
  setPlayerProfile(result.profile);
  applyFaceSettings(baseline);
  assert.ok(getPlayerProfile());
  baseline.weights.jaw = 1.1;
  applyFaceSettings(baseline);
  assert.equal(getPlayerProfile(), null);
  assert.equal(analyzeFaceSettings(cats(), baseline, result.profile).profileApplied, false);
  resetFaceSettings();
});


test('player amplitude compensation is bounded to minus/plus 25 percent', () => {
  const cal = createFaceCalibration();
  const strong = [{}, { mouthSmileLeft: 1, mouthSmileRight: 1 }, { mouthFrownLeft: 1, mouthFrownRight: 1 }, { jawOpen: 1 }, { eyeBlinkLeft: 1, eyeBlinkRight: 1 }];
  let result;
  strong.forEach((pose, i) => { result = feed(cal, pose, i * 2000); });
  assert.equal(result.profile.channels.smile.gain, .75);
  assert.equal(result.profile.channels.smile.compensationPercent, -25);
  for (const channel of Object.values(result.profile.channels)) {
    assert.ok(channel.gain >= .75 && channel.gain <= 1.25);
  }
});
