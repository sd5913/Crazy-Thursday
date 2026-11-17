// Pure end-of-run statistics and result selection. No DOM dependencies, so
// every branch of the priority ladder can be exercised in node:test.
// Game rules live in logic.js; this file only accumulates what happened and
// maps it to one of the nine endings.

import { INTENT, OUTCOME } from './logic.js';
import { GLITCH_PHOTO } from './cthulhu.js';

export const RESULT = {
  SIXTY_SEVEN: 'sixtySeven',
  CTHULHU: 'cthulhu',
  GLUTTON: 'glutton',
  VEGETATIVE: 'vegetative',
  MASK: 'mask',
  STILL_HUNGRY: 'stillHungry',
  SHARP_EYES: 'sharpEyes',
  PICA: 'pica',
  OBSERVATION: 'observation',
};

// Endings with a fixed card picture instead of the failure snapshot.
export const RESULT_PHOTO = {
  [RESULT.SIXTY_SEVEN]: 'assets/67.jpg',
  [RESULT.CTHULHU]: GLITCH_PHOTO,
  [RESULT.GLUTTON]: 'assets/aha.jpg',
  [RESULT.MASK]: 'assets/TheMask.jpg',
  [RESULT.SHARP_EYES]: 'assets/sharpeyes.png',
};

export const CTHULHU_STREAK = 6;
export const SHARP_EYES_MIN_FOREIGN = 3;
export const LUCKY_NUMBER = 67;

// Which stat hit 67 determines which number the share card spotlights.
export function sixtySevenField({ score, seconds, maxCombo }) {
  if (score === LUCKY_NUMBER) return 'score';
  if (seconds === LUCKY_NUMBER) return 'seconds';
  if (maxCombo === LUCKY_NUMBER) return 'maxCombo';
  return null;
}

// Every combo increase pays out points equal to the new streak length.
// Resets and steady states pay nothing.
export function comboScoreBonus(previousCombo, nextCombo) {
  return nextCombo > previousCombo ? nextCombo : 0;
}

export function createResultStats() {
  return {
    eatScore: 0, // points from actually eating (correct + surreal accepts)
    foreignServed: 0, // inedible items = foreign_object + lookalike
    foreignRefused: 0,
    foreignDiscomfort: 0, // net APPLIED discomfort, not nominal deltas
    surrealDiscomfort: 0,
    defenseStreak: 0,
    maxDefenseStreak: 0,
    reactions: 0, // rounds judged with accept / reject / defend
    pendingRescueCategory: null, // bucket the current rescue belongs to
  };
}

const bucket = (item) => (item?.eatable === false ? 'foreign' : item?.category === 'surreal_food' ? 'surreal' : null);

// Call once per served round with the delta that ACTUALLY changed the discomfort
// bar (after the 0..MAX clamp), so the two buckets always sum to the total.
export function recordServe(stats, { item, intent, outcome, appliedDiscomfort = 0, faceLost = false }) {
  const category = bucket(item);
  if (category === 'foreign') {
    stats.foreignServed += 1;
    if (outcome.type === OUTCOME.CORRECT_REJECT) stats.foreignRefused += 1;
  }
  if (intent !== INTENT.NEUTRAL) stats.reactions += 1;
  if (outcome.type === OUTCOME.CORRECT_ACCEPT || outcome.type === OUTCOME.SURREAL_ACCEPT) {
    stats.eatScore += outcome.scoreDelta;
  }
  // Eyes-closed defenses and rounds with no face at all both feed the streak;
  // any other round breaks it. Six in a row is the threshold.
  if (outcome.type === OUTCOME.DEFENDED || faceLost) {
    stats.defenseStreak += 1;
    stats.maxDefenseStreak = Math.max(stats.maxDefenseStreak, stats.defenseStreak);
  } else {
    stats.defenseStreak = 0;
  }
  if (appliedDiscomfort) {
    if (category === 'foreign') stats.foreignDiscomfort += appliedDiscomfort;
    else if (category === 'surreal') stats.surrealDiscomfort += appliedDiscomfort;
  }
  if (outcome.type === OUTCOME.WRONG_EAT) stats.pendingRescueCategory = category;
}

// A rescue's relief/penalty belongs to the item that caused the wrong bite.
export function recordRescue(stats, appliedDiscomfort = 0) {
  if (stats.pendingRescueCategory === 'foreign') stats.foreignDiscomfort += appliedDiscomfort;
  else if (stats.pendingRescueCategory === 'surreal') stats.surrealDiscomfort += appliedDiscomfort;
  stats.pendingRescueCategory = null;
}

// First match wins: hardest / rarest endings outrank common ones.
export function determineResult(state, stats, seconds = 0) {
  const discomfort = state.discomfort;
  // A 67 in any headline stat wins over every other ending, including the
  // six-blink frenzy, no matter what else happened in the run.
  if (sixtySevenField({ score: state.score, seconds, maxCombo: state.maxCombo })) return RESULT.SIXTY_SEVEN;
  if (stats.maxDefenseStreak >= CTHULHU_STREAK) return RESULT.CTHULHU;
  if (state.score > 500 && state.score > 0 && stats.eatScore / state.score > 0.5) return RESULT.GLUTTON;
  if (stats.reactions === 0) return RESULT.VEGETATIVE;
  if (state.maxCombo >= 20) return RESULT.MASK;
  if (discomfort > 0 && stats.surrealDiscomfort / discomfort > 0.7) return RESULT.STILL_HUNGRY;
  if (stats.foreignServed >= SHARP_EYES_MIN_FOREIGN
    && stats.foreignRefused / stats.foreignServed > 0.7) return RESULT.SHARP_EYES;
  if (discomfort > 0 && stats.foreignDiscomfort / discomfort > 0.7) return RESULT.PICA;
  return RESULT.OBSERVATION;
}
