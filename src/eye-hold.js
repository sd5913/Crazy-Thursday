export function protectedEyeExpression(expression, ready) {
  return expression === 'blink' && !ready ? 'neutral' : expression;
}

// Accumulate only intervals backed by fresh detections, never cached rAF frames.
export function createEyeHold() {
  let start = null;
  let last = null;
  let elapsedMs = 0;
  return {
    reset() { start = null; last = null; elapsedMs = 0; },
    update({ inferred, closed, now, durationMs = 500 }) {
      if (last !== null && now - last > 200) this.reset();
      if (inferred) {
        if (!closed) this.reset();
        else {
          if (start === null) start = now;
          last = now;
          elapsedMs = now - start;
        }
      }
      return { elapsedMs, requiredMs: durationMs, ready: start !== null && elapsedMs >= durationMs };
    },
  };
}
