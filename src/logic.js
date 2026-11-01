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
  NEUTRAL: 'neutral',
};

export const INTENT = {
  ACCEPT: 'accept',
  REJECT: 'reject',
  NEUTRAL: 'neutral',
};

export const OUTCOME = {
  CORRECT_ACCEPT: 'correctAccept',
  CORRECT_REJECT: 'correctReject',
  DECLINED_FOOD: 'declinedFood',
  WRONG_EAT: 'wrongEat',
};

export const SCORING = {
  CORRECT_POINTS: 10,
  WRONG_EAT_DISCOMFORT: 25,
  RESCUE_SUCCESS_RELIEF: 15, // net discomfort on a good puke = 10
  RESCUE_FAIL_PENALTY: 10, // net discomfort on a failed puke = 35
  MAX_DISCOMFORT: 100,
};

// MediaPipe FaceLandmarker exposes 52 ARKit-style blendshapes. We read four.
const BS = {
  SMILE_L: 'mouthSmileLeft',
  SMILE_R: 'mouthSmileRight',
  FROWN_L: 'mouthFrownLeft',
  FROWN_R: 'mouthFrownRight',
  JAW: 'jawOpen',
  TONGUE: 'tongueOut',
};

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
    vomitJawOpen: Math.max((b.vomit?.jaw ?? 0) * 0.85, base('jaw') + 0.25, 0.4),
    vomitTongue: Math.max((b.vomit?.tongue ?? 0) * 0.6, base('tongue') + 0.08, 0.12),
  };
}

// Classify the whole face into one of four expressions for the HUD.
export function classifyExpression(categories, thresholds) {
  if (!categories || !thresholds) return EXPRESSIONS.NEUTRAL;
  const smile = (blendshapeScore(categories, BS.SMILE_L) + blendshapeScore(categories, BS.SMILE_R)) / 2;
  const frown = (blendshapeScore(categories, BS.FROWN_L) + blendshapeScore(categories, BS.FROWN_R)) / 2;
  const jaw = blendshapeScore(categories, BS.JAW);
  const tongue = blendshapeScore(categories, BS.TONGUE);

  // Vomit first: wide jaw plus tongue, or an extremely open mouth.
  if (
    (jaw >= thresholds.vomitJawOpen && tongue >= thresholds.vomitTongue) ||
    (jaw >= thresholds.vomitJawOpen + 0.15)
  ) {
    return EXPRESSIONS.VOMIT;
  }
  if (smile >= thresholds.smile && smile >= frown) return EXPRESSIONS.SMILE;
  if (frown >= thresholds.frown && frown > smile) return EXPRESSIONS.FROWN;
  return EXPRESSIONS.NEUTRAL;
}

// At the spoon's arrival we only care about accept / reject / neutral.
// A missing face (null categories) resolves to NEUTRAL, which the judge treats
// as "eat" -- matching the design's "no expression defaults to eating".
export function intentFromExpression(categories, thresholds) {
  const expr = classifyExpression(categories, thresholds);
  if (expr === EXPRESSIONS.SMILE) return INTENT.ACCEPT;
  if (expr === EXPRESSIONS.FROWN) return INTENT.REJECT;
  return INTENT.NEUTRAL;
}

// Decide the outcome when the spoon reaches the mouth.
export function judge(item, intent) {
  const eat = intent !== INTENT.REJECT; // neutral or smile => accept the food
  if (!eat) {
    return item.eatable
      ? { type: OUTCOME.DECLINED_FOOD, scoreDelta: 0, discomfortDelta: 0 }
      : { type: OUTCOME.CORRECT_REJECT, scoreDelta: SCORING.CORRECT_POINTS, discomfortDelta: 0 };
  }
  if (item.eatable) {
    return { type: OUTCOME.CORRECT_ACCEPT, scoreDelta: SCORING.CORRECT_POINTS, discomfortDelta: 0 };
  }
  return { type: OUTCOME.WRONG_EAT, scoreDelta: 0, discomfortDelta: SCORING.WRONG_EAT_DISCOMFORT };
}

// Feeding speeds up over time by shortening travel time (the serve window in
// which the player reacts) and the gap between rounds. Both are clamped so the
// expression still has time to register.
export function speedForRound(round, opts = {}) {
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
  return {
    travelMs: clamp(o.startTravel - round * o.travelDecay, o.minTravel, o.startTravel),
    gapMs: clamp(o.startGap - round * o.gapDecay, o.minGap, o.startGap),
  };
}

// Apply a wrong-eat rescue result to the current discomfort.
export function applyRescue(currentDiscomfort, success) {
  const delta = success ? -SCORING.RESCUE_SUCCESS_RELIEF : SCORING.RESCUE_FAIL_PENALTY;
  return Math.max(0, Math.min(SCORING.MAX_DISCOMFORT, currentDiscomfort + delta));
}

// The starter catalogue: 8 items, 3 edible + 5 not. `emoji` is the spoon prop,
// `line` is the nurse's line for absurd items (the comedic read).
export const ITEMS = [
  { id: 'congee', name: '粥', emoji: '🥣', eatable: true, line: '趁热喝。' },
  { id: 'pudding', name: '布丁', emoji: '🍮', eatable: true, line: '甜品时间。' },
  { id: 'cake', name: '蛋糕', emoji: '🍰', eatable: true, line: '生日快乐。' },
  { id: 'mustard', name: '整勺芥末', emoji: '🥄', eatable: false, line: '补点维生素。' },
  { id: 'lemon', name: '超酸柠檬', emoji: '🍋', eatable: false, line: '清火。' },
  { id: 'chili', name: '辣椒酱', emoji: '🌶️', eatable: false, line: '开胃。' },
  { id: 'cactus', name: '仙人掌', emoji: '🌵', eatable: false, line: '今天多吃点蔬菜。' },
  { id: 'soap', name: '像巧克力的肥皂', emoji: '🧼', eatable: false, line: '新口味巧克力。' },
];

export function randomItem(rng = Math.random) {
  return ITEMS[Math.floor(rng() * ITEMS.length)];
}
