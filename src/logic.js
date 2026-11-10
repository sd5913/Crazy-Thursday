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
  // Eye-defense blocks the bite but is not free: dodging meals forever must
  // still build towards Game Over.
  DEFEND_DISCOMFORT: 5,
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
  PRESS_L: 'mouthPressLeft',
  PRESS_R: 'mouthPressRight',
  JAW: 'jawOpen',
  TONGUE: 'tongueOut',
  BLINK_L: 'eyeBlinkLeft',
  BLINK_R: 'eyeBlinkRight',
};

// Average the two sides. MediaPipe's left/right scores are rarely identical
// (lighting, head angle, a crooked mouth); the mean keeps a genuine but mild
// expression readable instead of discarding the stronger side.
const both = (l, r) => (l + r) / 2;

export function blendshapeScore(categories, name, fallback = 0) {
  if (!Array.isArray(categories)) return fallback;
  for (const c of categories) {
    if (c.categoryName === name) return c.score;
  }
  return fallback;
}

// mouthFrownLeft/Right is by far the weakest face blendshape: an obvious grimace
// often scores only 0.1-0.3, while mouthSmile* easily reaches 0.6-0.9. A
// tight-lipped "no" shows up mostly in mouthPress* instead, so use it as a
// discounted backup channel. Calibration (game.js aggregate) and judgement
// MUST share this exact function or the threshold would measure a different
// value from the one being classified.
export function frownScore(categories) {
  const corners = both(
    blendshapeScore(categories, BS.FROWN_L),
    blendshapeScore(categories, BS.FROWN_R)
  );
  const press = both(
    blendshapeScore(categories, BS.PRESS_L),
    blendshapeScore(categories, BS.PRESS_R)
  );
  return Math.max(corners, press * 0.5);
}

// Derive usable thresholds from a calibration session. `baseline` holds the
// max score seen per signal while the player posed each expression. The margins
// keep a relaxed neutral from reading as an expression, and the floors keep the
// defaults sane for people who skipped a step.
export function buildThresholds(cal) {
  const b = cal || {};
  const base = (k) => (b.neutral && b.neutral[k] != null ? b.neutral[k] : 0);
  // Frown gets its own, much lower bar: a small rise over the player's resting
  // face is enough, and a very expressive calibration pose must not push the
  // bar out of reach for everyday frowns.
  const frownFloor = Math.max(0.09, base('frown') + 0.04);
  const frownCap = Math.max(frownFloor, 0.22);
  return {
    // 0.7 (not 0.8) so everyday poses do not have to be stronger than the ones
    // made during calibration.
    smile: Math.max((b.smile?.smile ?? 0) * 0.7, base('smile') + 0.15, 0.3),
    frown: Math.min(Math.max((b.frown?.frown ?? 0) * 0.5, frownFloor), frownCap),
    // jawOpen is the gag's key signal; the floor stays low enough that an
    // uncalibrated open mouth is still recognised. Calibration raises it.
    vomitJawOpen: Math.max((b.vomit?.jaw ?? 0) * 0.85, base('jaw') + 0.25, 0.4),
    vomitTongue: Math.max((b.vomit?.tongue ?? 0) * 0.6, base('tongue') + 0.08, 0.12),
    // Calibrated from the dedicated Lidded step.
    blink: Math.max((b.blink?.blink ?? 0) * 0.7, 0.5),
  };
}

// Eye closure is fully independent of the mouth: smiling, frowning or talking
// while shutting your eyes cannot mask it.
export function eyesClosed(categories, thresholds) {
  if (!categories || !thresholds) return false;
  return both(
    blendshapeScore(categories, BS.BLINK_L),
    blendshapeScore(categories, BS.BLINK_R)
  ) >= thresholds.blink;
}

// Classify the face for the HUD. Priority is by signal exclusivity, not by a
// global score ranking:
//   1. Gag       -> jawOpen (tongueOut only LOWERS the required jaw opening)
//   2. Eyes shut -> eyeBlink L/R only (mouth signals are ignored entirely)
//   3. Smile     -> mouthSmile L/R (must beat its own threshold)
//   4. Frown     -> frownScore() (weak corners OR pressed lips)
export function classifyExpression(categories, thresholds) {
  if (!categories || !thresholds) return EXPRESSIONS.NEUTRAL;
  const smile = both(blendshapeScore(categories, BS.SMILE_L), blendshapeScore(categories, BS.SMILE_R));
  const frown = frownScore(categories);
  const jaw = blendshapeScore(categories, BS.JAW);
  const tongue = blendshapeScore(categories, BS.TONGUE);
  const shut = eyesClosed(categories, thresholds);
  const tongueOut = tongue >= thresholds.vomitTongue;

  // jawOpen drives the gag. Sticking the tongue out is a bonus that lowers the
  // bar -- most people gag without actually sticking their tongue out, so it
  // must NOT be a hard requirement.
  const gagJaw = thresholds.vomitJawOpen - (tongueOut ? 0.15 : 0);
  // A real gag (tongue out) may override closed eyes so the rescue/purge
  // gesture still works. Otherwise closed eyes win over EVERY mouth shape:
  // chatting / laughing / grimacing while defending no longer cancels it.
  if (jaw >= gagJaw && (tongueOut || !shut)) return EXPRESSIONS.VOMIT;
  if (shut) return EXPRESSIONS.BLINK;
  if (smile >= thresholds.smile && smile >= frown + 0.05) return EXPRESSIONS.SMILE;
  // A genuine smile already returned above. mouthSmile* carries a constant
  // 0.1-0.2 resting bias on many faces, so requiring frown to beat smile (the
  // old "+ 0.05" margin) swallowed almost every frown. Here we only need to
  // know the player is not actually smiling.
  if (frown >= thresholds.frown && smile < thresholds.smile) return EXPRESSIONS.FROWN;
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
  // No eating and no points, but each dodge still adds a little discomfort so
  // defending forever is not a free win. The caller (resolveServe) breaks the
  // combo on defense but still accelerates the game, like a correct play.
  if (intent === INTENT.DEFEND) {
    return { type: OUTCOME.DEFENDED, scoreDelta: 0, discomfortDelta: SCORING.DEFEND_DISCOMFORT };
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
