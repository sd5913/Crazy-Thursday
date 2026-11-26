// Decode-before-show helper for food images. Setting img.src only starts a
// request; on a slow hosted site the picture can arrive after the serving
// timer has begun, so the spoon/judgement drift out of sync with the visible
// dish. Awaiting decode() ties the round start to the actual pixels.

const cache = new Map(); // src -> Promise<void>

export function preloadImage(src) {
  if (!src) return Promise.resolve();
  if (cache.has(src)) return cache.get(src);
  const task = new Promise((resolve) => {
    if (typeof Image === 'undefined' || typeof document === 'undefined') { resolve(); return; }
    const img = new Image();
    img.decoding = 'async';
    const done = () => resolve();
    if (typeof img.decode === 'function') {
      img.src = src;
      img.decode().then(done, done); // decode rejects on unsupported formats; still proceed
    } else {
      img.onload = done;
      img.onerror = done; // never block a round on a broken image
      img.src = src;
    }
  });
  cache.set(src, task);
  return task;
}

// Warm a few upcoming dishes without holding up the current round.
export function prefetchImages(sources) {
  for (const src of sources || []) void preloadImage(src);
}
