import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  nextMessage,
  classifyExpression,
  intentFromExpression,
  judge,
  buildThresholds,
  speedForRound,
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
  assert.equal(classifyExpression(cats({ jawOpen: 0.5 }), TH), EXPRESSIONS.VOMIT); // extremely open fallback
  assert.equal(classifyExpression(cats({}), TH), EXPRESSIONS.NEUTRAL);
  assert.equal(classifyExpression(null, TH), EXPRESSIONS.NEUTRAL);
});

test('intent: smile accepts, frown rejects, neutral/missing eats', () => {
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
  // Neutral (no face) defaults to eating:
  assert.equal(judge(cactus, INTENT.NEUTRAL).type, OUTCOME.WRONG_EAT);
  assert.equal(judge(cake, INTENT.NEUTRAL).type, OUTCOME.CORRECT_ACCEPT);
});

test('judge scoring matches the design', () => {
  assert.equal(judge({ eatable: true }, INTENT.ACCEPT).scoreDelta, SCORING.CORRECT_POINTS);
  assert.equal(judge({ eatable: false }, INTENT.ACCEPT).discomfortDelta, SCORING.WRONG_EAT_DISCOMFORT);
  assert.equal(judge({ eatable: true }, INTENT.REJECT).scoreDelta, 0);
  assert.equal(judge({ eatable: true }, INTENT.REJECT).discomfortDelta, 0);
});

test('speedForRound accelerates but clamps to a fair minimum', () => {
  const early = speedForRound(0);
  const late = speedForRound(50);
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
