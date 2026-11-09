import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  nextMessage,
  classifyExpression,
  eyesClosed,
  intentFromExpression,
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

test('legacy signal message still works', () => {
  assert.match(nextMessage(1), /Signal 1 sent/);
  assert.match(nextMessage(2), /Signal 2 sent/);
});

const cats = (over) => {
  const base = {
    mouthSmileLeft: 0, mouthSmileRight: 0,
    mouthFrownLeft: 0, mouthFrownRight: 0,
    jawOpen: 0, tongueOut: 0,
    eyeBlinkLeft: 0, eyeBlinkRight: 0,
  };
  return Object.entries({ ...base, ...over }).map(([categoryName, score]) => ({ categoryName, score }));
};

const TH = buildThresholds({
  neutral: { smile: 0.05, frown: 0.05, jaw: 0.05, tongue: 0.0 },
  smile: { smile: 0.9, frown: 0.1, jaw: 0.1, tongue: 0.0 },
  frown: { smile: 0.1, frown: 0.8, jaw: 0.1, tongue: 0.0 },
  vomit: { smile: 0.1, frown: 0.1, jaw: 0.95, tongue: 0.7 },
});

test('classifyExpression maps each pose', () => {
  assert.equal(classifyExpression(cats({ mouthSmileLeft: 0.9, mouthSmileRight: 0.9 }), TH), EXPRESSIONS.SMILE);
  assert.equal(classifyExpression(cats({ mouthFrownLeft: 0.8, mouthFrownRight: 0.8 }), TH), EXPRESSIONS.FROWN);
  assert.equal(classifyExpression(cats({ jawOpen: 0.95, tongueOut: 0.7 }), TH), EXPRESSIONS.VOMIT);
  assert.equal(classifyExpression(cats({ jawOpen: 0.98 }), TH), EXPRESSIONS.VOMIT); // wider than calibrated open, no tongue
  assert.equal(classifyExpression(cats({}), TH), EXPRESSIONS.NEUTRAL);
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
});

test('eye-defense: blink closes eyes and defends (safe, no discomfort, breaks combo upstream)', () => {
  const closed = cats({ eyeBlinkLeft: 1, eyeBlinkRight: 1 });
  assert.equal(classifyExpression(closed, TH), EXPRESSIONS.BLINK);
  assert.equal(intentFromExpression(closed, TH), INTENT.DEFEND);
  const out = judge({ eatable: true }, INTENT.DEFEND);
  assert.equal(out.type, OUTCOME.DEFENDED);
  assert.equal(out.discomfortDelta, 0); // never eats, never hurts
  assert.equal(out.scoreDelta, 0);
  // Eyes shut with a neutral mouth still reads as defense.
  assert.equal(classifyExpression(cats({ eyeBlinkLeft: 1, eyeBlinkRight: 1, mouthSmileLeft: 0, mouthSmileRight: 0, mouthFrownLeft: 0, mouthFrownRight: 0 }), TH), EXPRESSIONS.BLINK);
});

test('closed eyes win over mouth signals (chatting / laughing while defending)', () => {
  const shut = { eyeBlinkLeft: 1, eyeBlinkRight: 1 };
  assert.equal(classifyExpression(cats({ ...shut, mouthSmileLeft: 0.9, mouthSmileRight: 0.9 }), TH), EXPRESSIONS.BLINK);
  assert.equal(classifyExpression(cats({ ...shut, mouthFrownLeft: 0.8, mouthFrownRight: 0.8 }), TH), EXPRESSIONS.BLINK);
  assert.equal(classifyExpression(cats({ ...shut, jawOpen: 0.6 }), TH), EXPRESSIONS.BLINK);
  assert.equal(intentFromExpression(cats({ ...shut, mouthSmileLeft: 0.9, mouthSmileRight: 0.9 }), TH), INTENT.DEFEND);
  // Only a real gag (open jaw AND tongue out) may override closed eyes.
  assert.equal(classifyExpression(cats({ ...shut, jawOpen: 0.95, tongueOut: 0.7 }), TH), EXPRESSIONS.VOMIT);
});

test('each expression relies on its own exclusive signals', () => {
  // Talking with an open mouth is not a gag, on calibrated or default floors.
  assert.equal(classifyExpression(cats({ jawOpen: 0.6 }), TH), EXPRESSIONS.NEUTRAL);
  assert.equal(classifyExpression(cats({ jawOpen: 0.6 }), buildThresholds(null)), EXPRESSIONS.NEUTRAL);
  // One-sided mouth / eye artefacts do not count as a full expression.
  assert.equal(classifyExpression(cats({ mouthSmileLeft: 0.9 }), TH), EXPRESSIONS.NEUTRAL);
  assert.equal(classifyExpression(cats({ eyeBlinkLeft: 1 }), TH), EXPRESSIONS.NEUTRAL);
  assert.equal(eyesClosed(cats({ eyeBlinkLeft: 1 }), TH), false);
  assert.equal(eyesClosed(cats({ eyeBlinkLeft: 1, eyeBlinkRight: 1 }), TH), true);
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
