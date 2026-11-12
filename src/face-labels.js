// One display vocabulary for gameplay, calibration and diagnostics.
export const FACE_LABELS = Object.freeze({
  smile: 'SMILE',
  refusal: 'REFUSAL',
  vomit: 'VOMIT',
  blink: 'EYES CLOSED',
  neutral: 'NEUTRAL',
  none: 'NO FACE',
});
export const FACE_DESCRIPTIONS = Object.freeze({
  smile: '微笑 / Smile',
  refusal: '拒绝 / Refusal',
  vomit: '呕吐 / Vomit',
  blink: '闭眼 / Eyes closed',
  neutral: '中性 / Neutral',
  none: '无脸 / No face',
});
export const faceLabel = (state) => FACE_LABELS[state] || ({ 'No face': FACE_LABELS.none, Waiting: 'WAITING', Error: 'ERROR' }[state] || state);
export const faceDescription = (state) => FACE_DESCRIPTIONS[state] || state;
