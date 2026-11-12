import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  nextMessage,
  classifyExpression as classifyRaw,
  eyesClosed as eyesClosedRaw,
  intentFromExpression as intentRaw,
  judge,
  buildThresholds,
  speedForLevel,
  applyRescue,
  randomItem,
  OUTCOME,
  INTENT,
  EXPRESSIONS,
  SCORING,
} from '../src/logic.js';

// Geometry fixtures are independent inputs; Blink scores alone cannot close eyes.
const geometry = (c) => {
  const score = (name) => c?.find((v) => v.categoryName === name)?.score || 0;
  return { left: score('eyeBlinkLeft') >= .8 ? .03 : .2, right: score('eyeBlinkRight') >= .8 ? .03 : .2 };
};
const classifyExpression = (c,t) => classifyRaw(c,t,geometry(c));
const eyesClosed = (c,t) => eyesClosedRaw(c,t,geometry(c));
const intentFromExpression = (c,t,h=true) => intentRaw(c,t,h,geometry(c));

test('legacy signal message still works', () => {
  assert.match(nextMessage(1), /Signal 1 sent/);
  assert.match(nextMessage(2), /Signal 2 sent/);
});

const cats = (over) => {
  const base = {
    mouthSmileLeft: 0, mouthSmileRight: 0,
    mouthFrownLeft: 0, mouthFrownRight: 0,
    mouthPressLeft: 0, mouthPressRight: 0,
    jawOpen: 0,
    eyeBlinkLeft: 0, eyeBlinkRight: 0, eyeSquintLeft: 1, eyeSquintRight: 1,
  };
  return Object.entries({ ...base, ...over }).map(([categoryName, score]) => ({ categoryName, score }));
};

const TH = buildThresholds({
  neutral: { smile: 0.05, frown: 0.05, jaw: 0.05 },
  smile: { smile: 0.9, frown: 0.1, jaw: 0.1 },
  frown: { smile: 0.1, frown: 0.8, jaw: 0.1 },
  vomit: { smile: 0.1, frown: 0.1, jaw: 0.95 },
});

test('classifyExpression maps each pose', () => {
  assert.equal(classifyExpression(cats({ mouthSmileLeft: 0.9, mouthSmileRight: 0.9 }), TH), EXPRESSIONS.SMILE);
  assert.equal(classifyExpression(cats({ mouthFrownLeft: 0.8, mouthFrownRight: 0.8 }), TH), EXPRESSIONS.REFUSAL);
  assert.equal(classifyExpression(cats({ jawOpen: 0.95 }), TH), EXPRESSIONS.VOMIT);
  assert.equal(classifyExpression(cats({ jawOpen: 0.98 }), TH), EXPRESSIONS.VOMIT); // wider than calibrated open, no tongue
  assert.equal(classifyExpression(cats({}), TH), EXPRESSIONS.NEUTRAL);
  assert.equal(classifyExpression(null, TH), EXPRESSIONS.NEUTRAL);
});

test('gag uses only calibrated jaw opening, including with closed eyes', () => {
  const shut = { eyeBlinkLeft: 1, eyeBlinkRight: 1 };
  assert.equal(classifyExpression(cats({ jawOpen: TH.vomitJawOpen }), TH), EXPRESSIONS.VOMIT);
  assert.equal(classifyExpression(cats({ ...shut, jawOpen: TH.vomitJawOpen }), TH), EXPRESSIONS.VOMIT);
  assert.equal(classifyExpression(cats({ ...shut, jawOpen: TH.vomitJawOpen - 0.01 }), TH), EXPRESSIONS.BLINK);
  assert.equal(classifyExpression(cats({ jawOpen: 0.3 }), TH), EXPRESSIONS.NEUTRAL);
  assert.equal(classifyExpression(null, TH), EXPRESSIONS.NEUTRAL);
});

test('intent: smile accepts, frown rejects, neutral/missing stays neutral', () => {
  assert.equal(intentFromExpression(cats({ mouthSmileLeft: 0.9, mouthSmileRight: 0.9 }), TH), INTENT.ACCEPT);
  assert.equal(intentFromExpression(cats({ mouthFrownLeft: 0.8, mouthFrownRight: 0.8 }), TH), INTENT.REJECT);
  assert.equal(intentFromExpression(cats({}), TH), INTENT.NEUTRAL);
  assert.equal(intentFromExpression(null, TH), INTENT.NEUTRAL);
});

test('judge: rewards correct plays, penalises wrong eats, no penalty for declined food', () => {
  const cake = { eatable: true };
  const cactus = { eatable: false };
  assert.equal(judge(cake, INTENT.ACCEPT).type, OUTCOME.CORRECT_ACCEPT);
  assert.equal(judge(cactus, INTENT.REJECT).type, OUTCOME.CORRECT_REJECT);
  assert.equal(judge(cake, INTENT.REJECT).type, OUTCOME.DECLINED_FOOD);
  assert.equal(judge(cactus, INTENT.ACCEPT).type, OUTCOME.WRONG_EAT);
  // A bad food with no expression is still eaten (failed to refuse it):
  assert.equal(judge(cactus, INTENT.NEUTRAL).type, OUTCOME.WRONG_EAT);
  // A good food with no expression is NOT eaten -- just declined, no points:
  assert.equal(judge(cake, INTENT.NEUTRAL).type, OUTCOME.DECLINED_FOOD);
});

test('judge scoring matches the design', () => {
  assert.equal(judge({ eatable: true }, INTENT.ACCEPT).scoreDelta, SCORING.CORRECT_POINTS);
  assert.equal(judge({ eatable: false }, INTENT.ACCEPT).discomfortDelta, SCORING.WRONG_EAT_DISCOMFORT);
  assert.equal(judge({ eatable: true }, INTENT.REJECT).scoreDelta, 0);
  assert.equal(judge({ eatable: true }, INTENT.REJECT).discomfortDelta, 0);
  assert.equal(judge({ eatable: true }, INTENT.DEFEND).discomfortDelta, SCORING.DEFEND_DISCOMFORT);
  assert.equal(judge({ eatable: true }, INTENT.DEFEND).scoreDelta, 0);
});

test('eye-defense: blink closes eyes and defends (+5 discomfort, breaks combo upstream)', () => {
  const closed = cats({ eyeBlinkLeft: 1, eyeBlinkRight: 1 });
  assert.equal(classifyExpression(closed, TH), EXPRESSIONS.BLINK);
  assert.equal(intentFromExpression(closed, TH), INTENT.DEFEND);
  const out = judge({ eatable: true }, INTENT.DEFEND);
  assert.equal(out.type, OUTCOME.DEFENDED);
  assert.equal(out.discomfortDelta, SCORING.DEFEND_DISCOMFORT); // no eating, but dodging still stings
  assert.equal(out.scoreDelta, 0);
  // The cost applies to any food, so defending cannot be a free stalling tactic.
  assert.equal(judge({ eatable: false }, INTENT.DEFEND).discomfortDelta, SCORING.DEFEND_DISCOMFORT);
  // Eyes shut with a neutral mouth still reads as defense.
  assert.equal(classifyExpression(cats({ eyeBlinkLeft: 1, eyeBlinkRight: 1, mouthSmileLeft: 0, mouthSmileRight: 0, mouthFrownLeft: 0, mouthFrownRight: 0 }), TH), EXPRESSIONS.BLINK);
});

test('closed eyes win over mouth signals (chatting / laughing while defending)', () => {
  const shut = { eyeBlinkLeft: 1, eyeBlinkRight: 1 };
  assert.equal(classifyExpression(cats({ ...shut, mouthSmileLeft: 0.9, mouthSmileRight: 0.9 }), TH), EXPRESSIONS.BLINK);
  assert.equal(classifyExpression(cats({ ...shut, mouthFrownLeft: 0.8, mouthFrownRight: 0.8 }), TH), EXPRESSIONS.BLINK);
  assert.equal(classifyExpression(cats({ ...shut, jawOpen: 0.6 }), TH), EXPRESSIONS.BLINK);
  assert.equal(intentFromExpression(cats({ ...shut, mouthSmileLeft: 0.9, mouthSmileRight: 0.9 }), TH), INTENT.DEFEND);
  // Deliberate wide opening also works with closed eyes, without a tongue signal.
  assert.equal(classifyExpression(cats({ ...shut, jawOpen: 0.95 }), TH), EXPRESSIONS.VOMIT);
});

test('each expression relies on its own exclusive signals', () => {
  // Normal talking (jaw ~0.3) is not a gag, on calibrated or default floors.
  assert.equal(classifyExpression(cats({ jawOpen: 0.3 }), TH), EXPRESSIONS.NEUTRAL);
  assert.equal(classifyExpression(cats({ jawOpen: 0.3 }), buildThresholds(null)), EXPRESSIONS.NEUTRAL);
  // A wide gagging jaw IS recognised even without sticking the tongue out.
  assert.equal(classifyExpression(cats({ jawOpen: 0.9 }), TH), EXPRESSIONS.VOMIT);
  // A weak one-sided signal is diluted by the average, not taken as a full pose.
  assert.equal(classifyExpression(cats({ mouthSmileLeft: 0.8 }), TH), EXPRESSIONS.NEUTRAL);
  assert.equal(classifyExpression(cats({ eyeBlinkLeft: 0.8 }), TH), EXPRESSIONS.NEUTRAL);
  assert.equal(eyesClosed(cats({ eyeBlinkLeft: 0.8 }), TH), false);
  assert.equal(eyesClosed(cats({ eyeBlinkLeft: 1, eyeBlinkRight: 1 }), TH), true);
});

// Regression: a realistic calibration must not push everyday-intensity poses
// down to NEUTRAL (that was the bug when both() used min plus high floors).
test('everyday-intensity poses stay recognisable after calibration', () => {
  const realTh = buildThresholds({
    neutral: { smile: 0.05, frown: 0.03, jaw: 0.02, blink: 0.08 },
    smile: { smile: 0.65, frown: 0.02, jaw: 0.08, blink: 0.1 },
    frown: { smile: 0.02, frown: 0.28, jaw: 0.05, blink: 0.1 },
    vomit: { smile: 0.02, frown: 0.05, jaw: 0.75, blink: 0.15 },
    blink: { smile: 0.03, frown: 0.03, jaw: 0.03, blink: 0.85 },
  });
  assert.equal(classifyExpression(cats({ mouthSmileLeft: 0.55, mouthSmileRight: 0.5 }), realTh), EXPRESSIONS.SMILE);
  assert.equal(classifyExpression(cats({ mouthFrownLeft: 0.22, mouthFrownRight: 0.18 }), realTh), EXPRESSIONS.REFUSAL);
  assert.equal(classifyExpression(cats({ jawOpen: 0.7 }), realTh), EXPRESSIONS.VOMIT);
  assert.equal(classifyExpression(cats({ eyeBlinkLeft: 0.75, eyeBlinkRight: 0.65 }), realTh), EXPRESSIONS.NEUTRAL);
  assert.equal(classifyExpression(cats({ eyeBlinkLeft: 0.85, eyeBlinkRight: 0.85 }), realTh), EXPRESSIONS.BLINK);
  assert.equal(classifyExpression(cats({}), realTh), EXPRESSIONS.NEUTRAL);
});

// Regression: frown is the weakest blendshape and mouthSmile* has a resting
// bias on real faces, so a mild frown must not be swallowed by the smile
// comparison or by a high calibrated bar.
test('mild frowns and tight-lipped refusals stay recognisable', () => {
  const realTh = buildThresholds({
    neutral: { smile: 0.12, frown: 0.03, jaw: 0.02, blink: 0.08 },
    smile: { smile: 0.65, frown: 0.02, jaw: 0.08, blink: 0.1 },
    frown: { smile: 0.02, frown: 0.28, jaw: 0.05, blink: 0.1 },
    vomit: { smile: 0.02, frown: 0.05, jaw: 0.75, blink: 0.15 },
    blink: { smile: 0.03, frown: 0.03, jaw: 0.03, blink: 0.85 },
  });
  // Weak corners plus a constant resting smile bias: previously NEUTRAL.
  assert.equal(
    classifyExpression(cats({ mouthFrownLeft: 0.18, mouthFrownRight: 0.14, mouthSmileLeft: 0.12, mouthSmileRight: 0.12 }), realTh),
    EXPRESSIONS.REFUSAL
  );
  // Pressed lips (a common "no") with no mouthFrown signal at all.
  assert.equal(classifyExpression(cats({ mouthPressLeft: 0.55, mouthPressRight: 0.45 }), realTh), EXPRESSIONS.NEUTRAL);
  // A real smile still wins; a neutral face with a smile bias stays neutral.
  assert.equal(classifyExpression(cats({ mouthSmileLeft: 0.6, mouthSmileRight: 0.6 }), realTh), EXPRESSIONS.SMILE);
  assert.equal(classifyExpression(cats({ mouthSmileLeft: 0.12, mouthSmileRight: 0.12 }), realTh), EXPRESSIONS.NEUTRAL);
  // An expressive calibration pose cannot push the frown bar out of reach.
  assert.ok(buildThresholds({ neutral: { frown: 0.03 }, frown: { frown: 0.9 } }).frown <= 0.22);
});

test('a short blink cannot fake a defense (hold gate)', () => {
  const shut = cats({ eyeBlinkLeft: 1, eyeBlinkRight: 1 });
  assert.equal(intentFromExpression(shut, TH, false), INTENT.NEUTRAL);
  assert.equal(intentFromExpression(shut, TH, true), INTENT.DEFEND);
  // Without the hold, the bite is judged normally instead of being defended.
  assert.equal(judge({ eatable: false }, intentFromExpression(shut, TH, false)).type, OUTCOME.WRONG_EAT);
});

test('speedForLevel accelerates with level but clamps to a fair minimum', () => {
  const early = speedForLevel(0);
  const late = speedForLevel(50);
  assert.ok(late.travelMs < early.travelMs);
  assert.ok(late.gapMs < early.gapMs);
  assert.ok(late.travelMs >= 1200); // minTravel floor
  assert.ok(late.gapMs >= 500); // minGap floor
});

test('applyRescue stays within 0..MAX and reflects success/failure', () => {
  assert.equal(applyRescue(0, true), 0); // relief cannot go negative
  assert.equal(applyRescue(25, true), 10); // 25 - 15
  assert.equal(applyRescue(25, false), 35); // 25 + 10
  assert.equal(applyRescue(99, false), SCORING.MAX_DISCOMFORT);
});

test('randomItem always picks a catalogue entry', () => {
  const seen = new Set();
  for (let i = 0; i < 50; i++) seen.add(randomItem().id);
  assert.ok(seen.size > 1);
});
