import { FACE_DESCRIPTIONS as FACE_LABELS } from './face-labels.js';
import { buildThresholds, closedEyeChecks, expressionScores, evaluateExpression, EXPRESSIONS, INTENT } from './logic.js';

export const FACE_ACTIONS = [
  ['smile', FACE_LABELS.smile, 'smile'],
  ['frown', FACE_LABELS.refusal, 'frown'],
  ['jaw', FACE_LABELS.vomit, 'vomitJawOpen'],
  ['blink', FACE_LABELS.blink, 'blink'],
];
const STORAGE_KEY = 'expression-feeding.face-settings.v1';
const browserStorage = () => typeof window === 'undefined' ? null : window.localStorage;

export function defaultFaceSettings() {
  return { weights: { smile: 1, frown: 1, jaw: 1, blink: 1 }, thresholds: buildThresholds(null), eyeHoldMs: 500, eyeOpennessLimit: 0.05 };
}

export function validateFaceSettings(settings) {
  for (const [key, , threshold] of FACE_ACTIONS) {
    const weight = settings?.weights?.[key];
    const value = settings?.thresholds?.[threshold];
    if (!Number.isFinite(weight) || weight < 0 || weight > 3 || !Number.isFinite(value) || value < 0 || value > 1) {
      throw new Error('Weight must be 0–3 and threshold must be 0–1.');
    }
  }
  const eyeHoldMs = settings.eyeHoldMs ?? 500;
  if (!Number.isFinite(eyeHoldMs) || eyeHoldMs < 200 || eyeHoldMs > 1500) throw new Error('Eye hold must be 200–1500 ms.');
  const eyeOpennessLimit = settings.eyeOpennessLimit ?? 0.05;
  if (!Number.isFinite(eyeOpennessLimit) || eyeOpennessLimit < 0 || eyeOpennessLimit > 0.5) throw new Error('Eye openness limit must be 0–0.5.');
  return {
    eyeOpennessLimit,
    eyeHoldMs,
    weights: Object.fromEntries(FACE_ACTIONS.map(([key]) => [key, settings.weights[key]])),
    thresholds: Object.fromEntries(FACE_ACTIONS.map(([, , key]) => [key, settings.thresholds[key]])),
  };
}

// Applied settings are shared by the debugger and game; storage is optional.
let applied = null;
let playerProfile = null;
try {
  const stored = browserStorage()?.getItem(STORAGE_KEY);
  if (stored) {
    const settings = JSON.parse(stored);
    if (settings.eyeOpennessLimit === 0.25) settings.eyeOpennessLimit = 0.05;
    if (settings.thresholds?.blink === 0.5) settings.thresholds.blink = 0.8;
    if (settings.eyeHoldMs === 350) settings.eyeHoldMs = 500;
    applied = validateFaceSettings(settings);
  }
} catch { /* Invalid or unavailable storage falls back to normal calibration. */ }

export function getAppliedFaceSettings() {
  return applied ? validateFaceSettings(applied) : null;
}

export function applyFaceSettings(settings) {
  const next = validateFaceSettings(settings);
  if (baselineSignature(next) !== baselineSignature(getBaseline())) playerProfile = null;
  applied = next;
  try {
    const storage = browserStorage();
    if (!storage) return false;
    storage.setItem(STORAGE_KEY, JSON.stringify(applied));
    return true;
  } catch {
    return false; // Still applied to the current page, but not persisted.
  }
}

export function resetFaceSettings() {
  applied = null;
  playerProfile = null;
  try { browserStorage()?.removeItem(STORAGE_KEY); } catch { /* Session reset still works. */ }
}

export function getBaseline() {
  return getAppliedFaceSettings() || defaultFaceSettings();
}

export function baselineSignature(settings) {
  const s = validateFaceSettings(settings);
  return JSON.stringify(['profile-v7-raw-eye-ratio', s.eyeHoldMs, s.eyeOpennessLimit, ...FACE_ACTIONS.flatMap(([key, , threshold]) => [s.weights[key], s.thresholds[threshold]])]);
}

export function getPlayerProfile(settings = getBaseline()) {
  return playerProfile?.signature === baselineSignature(settings) ? structuredClone(playerProfile) : null;
}

export function setPlayerProfile(profile) {
  if (profile && profile.signature !== baselineSignature(getBaseline())) throw new Error('Baseline changed; recalibrate.');
  playerProfile = profile ? structuredClone(profile) : null;
}

export function analyzeFaceSettings(categories, settings, profile = null, geometry = null) {
  if (!categories) return null;
  const raw = expressionScores(categories);
  const valid = profile?.signature === baselineSignature(settings);
  const corrected = Object.fromEntries(FACE_ACTIONS.map(([key]) => [key, key === 'blink' ? 0 : valid
    ? Math.max(0, Math.min(1, (raw[key] - profile.channels[key].neutral) * profile.channels[key].gain))
    : raw[key]]));
  const weighted = Object.fromEntries(FACE_ACTIONS.map(([key]) => [key, corrected[key] * settings.weights[key]]));
  weighted.eyeGeometryRequired = true;
  weighted.eyeOpennessLimit = settings.eyeOpennessLimit ?? 0.05;
  weighted.eyeOpenness = geometry;
  return { raw, corrected, weighted, profileApplied: valid, ...evaluateExpression(weighted, settings.thresholds) };
}

export function gameFaceAnalysis(categories, context, geometry = null) {
  if (!categories || !context) return null;
  const baseline = context.baseline || getBaseline();
  return analyzeFaceSettings(categories, baseline, context.profile || null, geometry);
}

export function classifyGameExpression(categories, context, geometry = null) {
  return gameFaceAnalysis(categories, context, geometry)?.expression || EXPRESSIONS.NEUTRAL;
}

export function gameEyesClosed(categories, context, geometry = null) {
  const analysis = gameFaceAnalysis(categories, context, geometry);
  return !!analysis && closedEyeChecks(analysis.weighted, (context.baseline || getBaseline()).thresholds).every((c) => c.passed);
}

export function gameIntentFromExpression(categories, context, holdOk = true, geometry = null) {
  const expression = classifyGameExpression(categories, context, geometry);
  if (expression === EXPRESSIONS.SMILE) return INTENT.ACCEPT;
  if (expression === EXPRESSIONS.REFUSAL) return INTENT.REJECT;
  if (expression === EXPRESSIONS.BLINK) return holdOk ? INTENT.DEFEND : INTENT.NEUTRAL;
  return INTENT.NEUTRAL;
}
