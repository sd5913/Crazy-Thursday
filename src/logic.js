// Pure game logic for the "expression feeding" game.
// No DOM / camera dependencies so these functions stay unit-testable with
// `node --test`. Expression detection lives in face.js; this file only turns
// blendshape scores and items into game outcomes.

export function nextMessage(count) {
  return `Signal ${count} sent. Make the next one yours.`;
}

export const EXPRESSIONS = {
  SMILE: 'smile',
  FROWN: 'frown',
  VOMIT: 'vomit',
  BLINK: 'blink',
  NEUTRAL: 'neutral',
};

export const INTENT = {
  ACCEPT: 'accept',
  REJECT: 'reject',
  DEFEND: 'defend',
  NEUTRAL: 'neutral',
};

export const OUTCOME = {
  CORRECT_ACCEPT: 'correctAccept',
  CORRECT_REJECT: 'correctReject',
  DECLINED_FOOD: 'declinedFood',
  WRONG_EAT: 'wrongEat',
  DEFENDED: 'defended',
};

export const SCORING = {
  CORRECT_POINTS: 10,
  WRONG_EAT_DISCOMFORT: 25,
  RESCUE_SUCCESS_RELIEF: 15, // net discomfort on a good puke = 10
  RESCUE_FAIL_PENALTY: 10, // net discomfort on a failed puke = 35
  MAX_DISCOMFORT: 100,
};

// MediaPipe FaceLandmarker exposes 52 ARKit-style blendshapes. Each expression
// is driven ONLY by its own most exclusive signals -- a signal from a different
// part of the face must never steal or suppress another expression.
const BS = {
  SMILE_L: 'mouthSmileLeft',
  SMILE_R: 'mouthSmileRight',
  FROWN_L: 'mouthFrownLeft',
  FROWN_R: 'mouthFrownRight',
  JAW: 'jawOpen',
  TONGUE: 'tongueOut',
  BLINK_L: 'eyeBlinkLeft',
  BLINK_R: 'eyeBlinkRight',
};

// Requiring BOTH sides avoids one-sided artefacts (talking with a crooked mouth,
// half-lit frames, a friend's face at the edge) reading as a full expression.
const both = (l, r) => Math.min(l, r);

export function blendshapeScore(categories, name, fallback = 0) {
  if (!Array.isArray(categories)) return fallback;
  for (const c of categories) {
    if (c.categoryName === name) return c.score;
  }
  return fallback;
}

// Derive usable thresholds from a calibration session. `baseline` holds the
// max score seen per signal while the player posed each expression. The margins
// keep a relaxed neutral from reading as an expression, and the floors keep the
// defaults sane for people who skipped a step.
export function buildThresholds(cal) {
  const b = cal || {};
  const base = (k) => (b.neutral && b.neutral[k] != null ? b.neutral[k] : 0);
  return {
    smile: Math.max((b.smile?.smile ?? 0) * 0.8, base('smile') + 0.15, 0.3),
    frown: Math.max((b.frown?.frown ?? 0) * 0.8, base('frown') + 0.12, 0.25),
    // Higher floor: ordinary talking/laughing (jaw ~0.3-0.5) must not read as
    // a gag when the player has not been calibrated.
    vomitJawOpen: Math.max((b.vomit?.jaw ?? 0) * 0.85, base('jaw') + 0.25, 0.55),
    vomitTongue: Math.max((b.vomit?.tongue ?? 0) * 0.6, base('tongue') + 0.08, 0.12),
    // Calibrated from a dedicated eyes-shut step; the floor suits most eyes.
    blink: Math.max((b.blink?.blink ?? 0) * 0.8, 0.6),
  };
}

// Eye closure is fully independent of the mouth: smiling, frowning or talking
// while shutting your eyes cannot mask it. Both eyes must be shut.
export function eyesClosed(categories, thresholds) {
  if (!categories || !thresholds) return false;
  return both(
    blendshapeScore(categories, BS.BLINK_L),
    blendshapeScore(categories, BS.BLINK_R)
  ) >= thresholds.blink;
}

// Classify the face for the HUD. Priority is by signal exclusivity, not by a
// global score ranking:
//   1. Gag      -> tongueOut + jawOpen (tongue is the exclusive signal)
//   2. Eyes shut -> eyeBlink L/R only (mouth signals are ignored entirely)
//   3. Smile / Frown -> their own mouth-corner signals plus a clear margin
export function classifyExpression(categories, thresholds) {
  if (!categories || !thresholds) return EXPRESSIONS.NEUTRAL;
  const smile = both(blendshapeScore(categories, BS.SMILE_L), blendshapeScore(categories, BS.SMILE_R));
  const frown = both(blendshapeScore(categories, BS.FROWN_L), blendshapeScore(categories, BS.FROWN_R));
  const jaw = blendshapeScore(categories, BS.JAW);
  const tongue = blendshapeScore(categories, BS.TONGUE);

  // Only a real gag (open jaw AND tongue out) may override closed eyes. This
  // keeps the rescue/purge gesture working even if the player screws up their
  // eyes while gagging.
  if (jaw >= thresholds.vomitJawOpen && tongue >= thresholds.vomitTongue) {
    return EXPRESSIONS.VOMIT;
  }
  // Closed eyes win over EVERY mouth shape: chatting, laughing or grimacing
  // while defending no longer cancels the defense.
  if (eyesClosed(categories, thresholds)) return EXPRESSIONS.BLINK;
  // A very wide jaw still reads as a gag for players who cannot stick their
  // tongue out -- but only with the eyes open (checked above).
  if (jaw >= thresholds.vomitJawOpen + 0.15) return EXPRESSIONS.VOMIT;
  // Smile / frown rely only on their own corners, with a margin so an
  // ambiguous half-smile does not flip-flop between the two.
  if (smile >= thresholds.smile && smile >= frown + 0.1) return EXPRESSIONS.SMILE;
  if (frown >= thresholds.frown && frown > smile + 0.1) return EXPRESSIONS.FROWN;
  return EXPRESSIONS.NEUTRAL;
}

// At the spoon's arrival we only care about accept / reject / defend / neutral.
// `holdOk` comes from the game loop: eyes must stay shut for a short window, so
// a natural blink on the arrival frame cannot fake a defense. Defaults to true
// for callers/tests that classify a single frame in isolation.
export function intentFromExpression(categories, thresholds, holdOk = true) {
  const expr = classifyExpression(categories, thresholds);
  if (expr === EXPRESSIONS.SMILE) return INTENT.ACCEPT;
  if (expr === EXPRESSIONS.FROWN) return INTENT.REJECT;
  if (expr === EXPRESSIONS.BLINK) return holdOk ? INTENT.DEFEND : INTENT.NEUTRAL;
  return INTENT.NEUTRAL;
}

// Decide the outcome when the spoon reaches the mouth.
export function judge(item, intent) {
  // Eye-defense: the patient shuts their eyes and refuses the bite outright.
  // Always safe (no eating, no discomfort). The caller (resolveServe) breaks the
  // combo on defense but still accelerates the game, like a correct play.
  if (intent === INTENT.DEFEND) {
    return { type: OUTCOME.DEFENDED, scoreDelta: 0, discomfortDelta: 0 };
  }
  // Eating only happens on an explicit ACCEPT (smile). A frown or no expression
  // means the patient did not take the bite, so a good food with no expression
  // is simply declined (no points), while a bad food with no expression is still
  // eaten -- the player failed to refuse it (just like the old default).
  if (intent === INTENT.ACCEPT) {
    return item.eatable
      ? { type: OUTCOME.CORRECT_ACCEPT, scoreDelta: SCORING.CORRECT_POINTS, discomfortDelta: 0 }
      : { type: OUTCOME.WRONG_EAT, scoreDelta: 0, discomfortDelta: SCORING.WRONG_EAT_DISCOMFORT };
  }
  if (!item.eatable && intent === INTENT.REJECT) {
    return { type: OUTCOME.CORRECT_REJECT, scoreDelta: SCORING.CORRECT_POINTS, discomfortDelta: 0 };
  }
  if (!item.eatable && intent === INTENT.NEUTRAL) {
    return { type: OUTCOME.WRONG_EAT, scoreDelta: 0, discomfortDelta: SCORING.WRONG_EAT_DISCOMFORT };
  }
  // Not eaten: edible refused/skipped, or inedible properly refused.
  return { type: OUTCOME.DECLINED_FOOD, scoreDelta: 0, discomfortDelta: 0 };
}

// Difficulty is a level that the game raises on a correct play and lowers on a
// mistake; level 0 is the initial (slowest-difficulty) pace, never slower.
// Speed comes from shortening the travel time (the serve window in which the
// player must react); both values are clamped so the expression still registers.
export function speedForLevel(level, opts = {}) {
  const o = {
    startTravel: 3500,
    travelDecay: 150,
    minTravel: 1200,
    startGap: 1500,
    gapDecay: 80,
    minGap: 500,
    ...opts,
  };
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const lv = Math.max(0, level);
  return {
    travelMs: clamp(o.startTravel - lv * o.travelDecay, o.minTravel, o.startTravel),
    gapMs: clamp(o.startGap - lv * o.gapDecay, o.minGap, o.startGap),
  };
}

// Apply a wrong-eat rescue result to the current discomfort.
export function applyRescue(currentDiscomfort, success) {
  const delta = success ? -SCORING.RESCUE_SUCCESS_RELIEF : SCORING.RESCUE_FAIL_PENALTY;
  return Math.max(0, Math.min(SCORING.MAX_DISCOMFORT, currentDiscomfort + delta));
}

// The starter catalogue: 8 items, 3 edible + 5 not. `emoji` is the spoon prop,
// `name` is the label, `line` is the nurse's deadpan bedside manner.
export const ITEMS = [
  { id: 'congee', name: 'Congee', emoji: '🥣', eatable: true, line: 'Still warm. Probably.' },
  { id: 'pudding', name: 'Pudding', emoji: '🍮', eatable: true, line: 'Sugar fixes everything. Maybe.' },
  { id: 'cake', name: 'Cake', emoji: '🍰', eatable: true, line: 'Happy birthday. Whoever you are.' },
  { id: 'mustard', name: 'A spoonful of mustard', emoji: '🥄', eatable: false, line: 'Some vitamins. Straight.' },
  { id: 'lemon', name: 'Sour lemon', emoji: '🍋', eatable: false, line: 'Detox. You will cry either way.' },
  { id: 'chili', name: 'Chili sauce', emoji: '🌶️', eatable: false, line: 'Mild.' },
  { id: 'cactus', name: 'Cactus', emoji: '🌵', eatable: false, line: 'Eat your vegetables.' },
  { id: 'soap', name: 'Chocolate-shaped soap', emoji: '🧼', eatable: false, line: 'New chocolate flavor.' },
];

export function randomItem(rng = Math.random) {
  return ITEMS[Math.floor(rng() * ITEMS.length)];
}

// Each item points at its placeholder art (src/assets/food/<id>.svg); the art
// team replaces the SVG (or repoints `image` to a PNG) without touching logic.
for (const it of ITEMS) it.image = `assets/food/${it.id}.svg`;
