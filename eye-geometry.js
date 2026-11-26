const EYES = { left: [362, 385, 387, 263, 373, 380], right: [33, 160, 158, 133, 153, 144] };

export function measureEyes(landmarks, width, height) {
  if (!landmarks || !(width > 0) || !(height > 0)) return null;
  const result = {};
  for (const [side, indices] of Object.entries(EYES)) {
    const points = indices.map((i) => landmarks[i]);
    if (points.some((p) => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y))) return null;
    const distance = (a, b) => Math.hypot((a.x - b.x) * width, (a.y - b.y) * height);
    const eyeWidth = distance(points[0], points[3]);
    if (eyeWidth < 1) return null;
    result[side] = (distance(points[1], points[5]) + distance(points[2], points[4])) / (2 * eyeWidth);
  }
  return result;
}
