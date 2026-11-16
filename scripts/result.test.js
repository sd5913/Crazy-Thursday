import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { INTENT, OUTCOME, SCORING, judge } from '../src/logic.js';
import { GLITCH_NAME, GLITCH_PHOTO } from '../src/cthulhu.js';
import {
  RESULT, RESULT_PHOTO, createResultStats, recordServe, recordRescue,
  determineResult, comboScoreBonus, CTHULHU_STREAK, SHARP_EYES_MIN_FOREIGN,
} from '../src/result.js';

const run = (over = {}) => ({ score: 0, discomfort: 0, maxCombo: 0, ...over });
const stats = (over = {}) => Object.assign(createResultStats(), over);
const foreign = { eatable: false, category: 'foreign_object' };
const surreal = { eatable: true, category: 'surreal_food' };
const food = { eatable: true, category: 'food' };

const serve = (s, item, intent, applied = 0) => recordServe(s, {
  item, intent, outcome: judge(item, intent), appliedDiscomfort: applied,
});

test('scoring matches the new balance: wrong bite 10, relief 5, net 5/20', () => {
  assert.equal(SCORING.WRONG_EAT_DISCOMFORT, 10);
  assert.equal(SCORING.RESCUE_SUCCESS_RELIEF, 5);
  assert.equal(judge(foreign, INTENT.ACCEPT).discomfortDelta, 10);
  assert.equal(judge(foreign, INTENT.NEUTRAL).discomfortDelta, 10); // forced feed
  assert.equal(10 - SCORING.RESCUE_SUCCESS_RELIEF, 5);
  assert.equal(10 + SCORING.RESCUE_FAIL_PENALTY, 20);
});

test('serve stats track eating points, refusals, reactions and defense streak', () => {
  const s = stats();
  serve(s, food, INTENT.ACCEPT);
  serve(s, surreal, INTENT.ACCEPT);
  serve(s, foreign, INTENT.REJECT);
  serve(s, food, INTENT.DEFEND);
  assert.equal(s.eatScore, SCORING.CORRECT_POINTS + SCORING.SURREAL_POINTS);
  assert.equal(s.foreignServed, 1);
  assert.equal(s.foreignRefused, 1);
  assert.equal(s.reactions, 4); // defense is a reaction too
  assert.equal(s.defenseStreak, 1);
  serve(s, food, INTENT.NEUTRAL);
  assert.equal(s.reactions, 4);
  assert.equal(s.defenseStreak, 0); // any other outcome breaks the streak
});

test('rescue relief and penalty are charged to the wrong-eaten item bucket', () => {
  const s = stats();
  serve(s, foreign, INTENT.NEUTRAL, 10);
  recordRescue(s, -5);
  assert.equal(s.foreignDiscomfort, 5); // "the small remainder after vomiting"
  recordServe(s, {
    item: foreign, intent: INTENT.ACCEPT,
    outcome: judge(foreign, INTENT.ACCEPT), appliedDiscomfort: 10,
  });
  recordRescue(s, 10);
  assert.equal(s.foreignDiscomfort, 25); // 5 (vomited) + 20 (not vomited)
});

test('six consecutive eyes-shut or no-face rounds feed the same streak', () => {
  const s = stats({ reactions: 6, eatScore: 600 });
  for (let i = 0; i < 3; i++) {
    recordServe(s, { item: food, intent: INTENT.DEFEND, outcome: judge(food, INTENT.DEFEND), faceLost: false });
  }
  for (let i = 0; i < 3; i++) {
    recordServe(s, { item: foreign, intent: INTENT.NEUTRAL, outcome: judge(foreign, INTENT.NEUTRAL), faceLost: true });
  }
  assert.equal(s.maxDefenseStreak, CTHULHU_STREAK);
  assert.equal(determineResult(run({ score: 900, discomfort: 30, maxCombo: 25 }), s), RESULT.CTHULHU);
  recordServe(s, { item: food, intent: INTENT.ACCEPT, outcome: judge(food, INTENT.ACCEPT), faceLost: false });
  assert.equal(s.defenseStreak, 0); // any other round breaks the chain
});

test('a full streak outranks every other ending', () => {
  const s = stats({ maxDefenseStreak: CTHULHU_STREAK, reactions: 6, eatScore: 600 });
  assert.equal(determineResult(run({ score: 900, discomfort: 30, maxCombo: 25 }), s), RESULT.CTHULHU);
  s.maxDefenseStreak = CTHULHU_STREAK - 1;
  assert.notEqual(determineResult(run({ score: 900, discomfort: 30, maxCombo: 25 }), s), RESULT.CTHULHU);
});

test('glutton: score > 500 and eating share > 50%, with reject points in the denominator', () => {
  const s = stats({ eatScore: 510, reactions: 40 });
  assert.equal(determineResult(run({ score: 501, discomfort: 100 }), s), RESULT.GLUTTON);
  assert.notEqual(determineResult(run({ score: 500, discomfort: 100 }), s), RESULT.GLUTTON); // strict
  assert.notEqual(determineResult(run({ score: 510, discomfort: 100 }), stats({ eatScore: 255 })), RESULT.GLUTTON); // exactly 50%
  assert.notEqual(determineResult(run({ score: 5000, discomfort: 100 }), stats({ eatScore: 100 })), RESULT.GLUTTON);
});

test('vegetative: no reactions at all outranks pica', () => {
  const s = stats({ foreignDiscomfort: 100, foreignServed: 5 });
  assert.equal(determineResult(run({ discomfort: 100 }), s), RESULT.VEGETATIVE);
  s.reactions = 1;
  assert.equal(determineResult(run({ discomfort: 100 }), s), RESULT.PICA);
});

test('mask: peak combo >= 20 outranks the discomfort-based results', () => {
  const s = stats({ reactions: 30, surrealDiscomfort: 80 });
  assert.equal(determineResult(run({ discomfort: 100, maxCombo: 20 }), s), RESULT.MASK);
  assert.notEqual(determineResult(run({ discomfort: 100, maxCombo: 19 }), s), RESULT.MASK);
});

test('still hungry: surreal share strictly above 70%', () => {
  const s = stats({ reactions: 30, surrealDiscomfort: 71 });
  assert.equal(determineResult(run({ discomfort: 100 }), s), RESULT.STILL_HUNGRY);
  s.surrealDiscomfort = 70;
  assert.notEqual(determineResult(run({ discomfort: 100 }), s), RESULT.STILL_HUNGRY);
});

test('sharp eyes: foreign-only denominator, minimum sample, outranks pica', () => {
  const s = stats({ reactions: 30, foreignServed: 10, foreignRefused: 8, foreignDiscomfort: 80 });
  assert.equal(determineResult(run({ discomfort: 100 }), s), RESULT.SHARP_EYES);
  s.foreignRefused = 7; // exactly 70%
  assert.equal(determineResult(run({ discomfort: 100 }), s), RESULT.PICA);
  s.foreignServed = SHARP_EYES_MIN_FOREIGN - 1;
  s.foreignRefused = s.foreignServed; // 2/2, still below the sample floor
  assert.notEqual(determineResult(run({ discomfort: 100 }), s), RESULT.SHARP_EYES);
});

test('pica: foreign share strictly above 70%', () => {
  const s = stats({ reactions: 20, foreignDiscomfort: 71, foreignServed: 4 });
  assert.equal(determineResult(run({ discomfort: 100 }), s), RESULT.PICA);
  s.foreignDiscomfort = 70;
  assert.notEqual(determineResult(run({ discomfort: 100 }), s), RESULT.PICA);
});

test('observation is the fallback, including a defense-only death', () => {
  const s = stats({ reactions: 20 });
  assert.equal(determineResult(run({ discomfort: 100 }), s), RESULT.OBSERVATION);
  assert.equal(determineResult(run({ discomfort: 0 }), stats({ reactions: 5 })), RESULT.OBSERVATION);
});

test('each combo increase awards points equal to the new streak length', () => {
  assert.equal(comboScoreBonus(0, 1), 1);
  assert.equal(comboScoreBonus(1, 2), 2);
  assert.equal(comboScoreBonus(9, 10), 10);
  assert.equal(comboScoreBonus(4, 4), 0);
  assert.equal(comboScoreBonus(12, 0), 0); // a broken streak pays nothing
});

test('only three endings swap the card photo', () => {
  assert.equal(RESULT_PHOTO[RESULT.CTHULHU], GLITCH_PHOTO);
  assert.equal(RESULT_PHOTO[RESULT.GLUTTON], 'assets/aha.jpg');
  assert.equal(RESULT_PHOTO[RESULT.MASK], 'assets/TheMask.jpg');
  assert.equal(RESULT_PHOTO[RESULT.PICA], undefined);
  assert.equal(RESULT_PHOTO[RESULT.OBSERVATION], undefined);
  assert.ok(GLITCH_PHOTO.endsWith(`${GLITCH_NAME}.jpg`));
  assert.ok(existsSync(fileURLToPath(new URL(`../src/${GLITCH_PHOTO}`, import.meta.url))));
});
