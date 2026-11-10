// Local, on-device face landmarking for the feeding game.
//
// Uses MediaPipe Tasks Vision (FaceLandmarker with face blendshapes) loaded from
// a CDN. The model is fetched from Google's public model bucket. Nothing is
// uploaded: every frame is processed in the browser / WebView locally.
//
// Requires an internet connection on first load (for the WASM + model), which is
// consistent with the course's local-processing privacy stance.

const VERSION = '0.10.18';
const VISION_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/vision_bundle.mjs`;
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/wasm`;
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

let landmarker = null;
let lastVideoTime = -1;
let lastDetectAt = 0;
// Some WebViews report a coarse (or stuck) video.currentTime. If no fresh
// timestamp arrives for this long, run detection again anyway instead of
// returning null forever and leaving the HUD stuck on NO FACE.
const FRAME_STALE_MS = 200;

export async function initFaceLandmarker() {
  if (landmarker) return landmarker;
  const { FaceLandmarker, FilesetResolver } = await import(VISION_URL);
  const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
  landmarker = await FaceLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
    runningMode: 'VIDEO',
    numFaces: 2, // a friend may be in frame; detectFace() picks the largest face
    outputFaceBlendshapes: true,
  });
  return landmarker;
}

// Returns the blendshape categories for the LARGEST face in the frame, or null
// when there is no fresh camera frame / no face at all. A null here is NOT
// necessarily "the player left" -- the caller reuses the last good result
// during brief gaps (see game.js loop). MediaPipe may report a bystander first,
// so pick by landmark bounding-box area instead of trusting index 0.
export function detectFace(video) {
  if (!landmarker || !video || video.readyState < 2) return null;
  const now = performance.now();
  if (video.currentTime === lastVideoTime && now - lastDetectAt < FRAME_STALE_MS) {
    return null; // no new camera frame yet
  }
  lastVideoTime = video.currentTime;
  lastDetectAt = now;
  const result = landmarker.detectForVideo(video, now);
  const shapes = result.faceBlendshapes;
  if (!shapes || shapes.length === 0) return null;

  const faces = result.faceLandmarks || [];
  let bestIdx = 0;
  let bestArea = -1;
  for (let i = 0; i < Math.min(faces.length, shapes.length); i++) {
    const pts = faces[i];
    if (!pts || pts.length === 0) continue;
    let minX = 1, minY = 1, maxX = 0, maxY = 0;
    for (const p of pts) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    const area = (maxX - minX) * (maxY - minY);
    if (area > bestArea) { bestArea = area; bestIdx = i; }
  }
  return shapes[bestIdx].categories || null;
}

// Open the local webcam. Resolves with the MediaStream on success.
export async function openCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('This environment has no camera (getUserMedia unavailable).');
  }
  return navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: 640, height: 480 },
    audio: false,
  });
}
