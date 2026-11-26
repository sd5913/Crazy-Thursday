import { FACE_LABELS } from './face-labels.js';
import { expressionScores } from './logic.js';
import { getBaseline, baselineSignature } from './face-settings.js';

export const SAMPLE_MS = 1500;
export const PLAYER_GAIN_MIN = 0.75;
export const PLAYER_GAIN_MAX = 1.25;
export const CALIBRATION_STEPS = [
  { image: 'assets/calibration/neutral.svg', imageAlt: 'Relaxed face', key: 'neutral', title: `Calibration 1/5 · ${FACE_LABELS.neutral}`, hint: 'Keep a relaxed face. Click to sample.' },
  { image: 'assets/calibration/smile.svg', imageAlt: 'Smile with mouth corners raised', key: 'smile', title: `Calibration 2/5 · ${FACE_LABELS.smile}`, hint: 'Smile and hold. Click to sample.' },
  { image: 'assets/calibration/frown.svg', imageAlt: 'Refusal: lower eyebrows or mouth corners', key: 'frown', title: `Calibration 3/5 · ${FACE_LABELS.refusal}`, hint: 'Lower your eyebrows or pull the mouth corners down, and hold.' },
  { image: 'assets/calibration/jaw.svg', imageAlt: 'Open your mouth wide', key: 'jaw', title: `Calibration 4/5 · ${FACE_LABELS.vomit}`, hint: 'Open your mouth wide and hold. Click to sample.' },
  { image: 'assets/calibration/blink.svg', imageAlt: 'Keep both eyes closed', key: 'blink', title: `Calibration 5/5 · ${FACE_LABELS.blink}`, hint: 'Close both eyes and hold. Click to sample.' },
];
// Initial reference amplitudes; not population statistics. Gains are bounded.
const REFERENCE = { smile: 0.65, frown: 0.28, jaw: 0.75, blink: 0.85 };
const MIN_DELTA = { smile: 0.1, frown: 0.04, jaw: 0.1, blink: 0.1 };
const KEYS = Object.keys(REFERENCE);
const REQUIRED = ['mouthSmileLeft', 'mouthSmileRight', 'mouthFrownLeft', 'mouthFrownRight', 'jawOpen', 'browDownLeft', 'browDownRight'];

export function percentile(values, fraction) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * fraction;
  const low = Math.floor(index);
  return sorted[low] + (sorted[Math.ceil(index)] - sorted[low]) * (index - low);
}

export function createCalibrationSample() {
  const frames = [];
  return {
    add(categories, elapsedMs, geometry) {
      if (elapsedMs < 250 || !categories?.length) return;
      if (!REQUIRED.every((name) => categories.some((c) => c.categoryName === name && Number.isFinite(c.score) && c.score >= 0 && c.score <= 1))) return;
      frames.push({ time: elapsedMs, ...expressionScores(categories), geometry });
    },
    result() {
      const stats = Object.fromEntries(KEYS.map((key) => {
        const values = frames.map((frame) => frame[key]);
        return [key, values.length ? {
          median: percentile(values, 0.5), p75: percentile(values, 0.75),
          iqr: percentile(values, 0.75) - percentile(values, 0.25),
        } : null];
      }));
      const eyes = Object.fromEntries(['left', 'right'].map((side) => {
        const valid = frames.filter((frame) => Number.isFinite(frame.geometry?.[side]));
        const values = valid.map((frame) => frame.geometry[side]);
        return [side, values.length >= 12 && valid.at(-1).time - valid[0].time >= 800 ? { median: percentile(values, .5), iqr: percentile(values, .75) - percentile(values, .25) } : null];
      }));
      return { eyes, stats, faceFrames: frames.length, spanMs: frames.length ? frames.at(-1).time - frames[0].time : 0 };
    },
  };
}

// One state machine for game and Debug. Only presentation differs.
export function createFaceCalibration(baseline = getBaseline()) {
  const signature = baselineSignature(baseline);
  const samples = {};
  let index = 0;
  let sample = null;
  let startedAt = 0;
  let profile = null;
  let error = null;
  let lastSample = null;
  function snapshot(now = startedAt) {
    return {
      step: CALIBRATION_STEPS[index], index, sampling: sample !== null,
      remainingMs: sample ? Math.max(0, SAMPLE_MS - (now - startedAt)) : 0,
      completed: !!profile, error, lastSample, profile,
    };
  }
  return {
    snapshot,
    startSample(now) {
      if (sample || profile) return snapshot(now);
      error = null;
      sample = createCalibrationSample();
      startedAt = now;
      return snapshot(now);
    },
    feed(categories, now, geometry = null) {
      if (!sample) return snapshot(now);
      sample.add(categories, now - startedAt, geometry);
      if (now - startedAt >= SAMPLE_MS) {
        const key = CALIBRATION_STEPS[index].key;
        lastSample = { key, ...sample.result() };
        sample = null;
        if (lastSample.faceFrames < 12 || lastSample.spanMs < 800) {
          error = 'Not enough fresh face samples. Face the camera and retry.';
        } else if ((key === 'neutral' || key === 'blink') && ['left', 'right'].some((side) => !lastSample.eyes[side])) {
          error = 'Eye landmarks unavailable. Face the camera and retry.';
        } else if (key === 'blink' && ['left', 'right'].some((side) => samples.neutral.eyes[side].median - lastSample.eyes[side].median < Math.max(.03, 3 * samples.neutral.eyes[side].iqr))) {
          error = 'Open and closed eyes are not distinct enough. Retry with both eyes fully closed.';
        } else if (key !== 'neutral' && key !== 'blink') {
          const neutral = samples.neutral.stats[key];
          const delta = lastSample.stats[key].p75 - neutral.median;
          if (delta < Math.max(MIN_DELTA[key], 3 * neutral.iqr)) {
            error = 'Action is not distinct enough from other face. Hold the target pose and retry.';
          }
        }
        if (!error) {
          samples[key] = lastSample;
          index++;
          if (index === CALIBRATION_STEPS.length) {
            profile = { signature, eyes: Object.fromEntries(['left', 'right'].map((side) => [side, { open: samples.neutral.eyes[side].median, closed: samples.blink.eyes[side].median }])), channels: Object.fromEntries(KEYS.map((name) => {
              const neutral = samples.neutral.stats[name].median;
              const action = samples[name].stats[name].p75;
              const unboundedGain = name === 'blink' ? 1 : REFERENCE[name] / (action - neutral);
              const gain = Math.max(PLAYER_GAIN_MIN, Math.min(PLAYER_GAIN_MAX, unboundedGain));
              return [name, { neutral, action, gain, compensationPercent: (gain - 1) * 100, limited: gain !== unboundedGain,
                delta: action - neutral, faceFrames: samples[name].faceFrames, spanMs: samples[name].spanMs }];
            })) };
          }
        }
      }
      return snapshot(now);
    },
  };
}
