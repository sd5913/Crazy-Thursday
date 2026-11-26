import { measureEyes } from './eye-geometry.js';
// Local, on-device face landmarking for the feeding game.
//
// MediaPipe code, WASM and model are bundled with the app. No CDN fallback.
// Every frame is processed locally in the browser / WebView.
const VERSION = '0.10.18';
const VISION_URL = new URL(`./vendor/mediapipe/${VERSION}/vision_bundle.mjs`, import.meta.url).href;
const WASM_URL = new URL(`./vendor/mediapipe/${VERSION}/wasm/`, import.meta.url).href;
const MODEL_URL = new URL('./vendor/mediapipe/face_landmarker.task', import.meta.url).href;

let landmarker = null;
let initialization = null;
// Some WebViews report a coarse (or stuck) video.currentTime. If no fresh
// timestamp arrives for this long, run detection again anyway instead of
// returning null forever and leaving the HUD stuck on NO FACE.
const FRAME_STALE_MS = 200;

export async function initFaceLandmarker() {
  if (landmarker) return landmarker;
  if (!initialization) {
    initialization = (async () => {
      const { FaceLandmarker, FilesetResolver } = await import(VISION_URL);
      const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
      landmarker = await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numFaces: 1, // single-player tracking enables MediaPipe's landmark smoothing
        outputFaceBlendshapes: true,
      });
      return landmarker;
    })().catch((err) => {
      initialization = null;
      throw err;
    });
  }
  return initialization;
}

// A skipped video frame is different from an inference that found no face.
export function createFaceSampler(getModel, clock = () => performance.now()) {
  let lastVideo = null;
  let lastVideoTime = -1;
  let lastDetectAt = -Infinity;
  return {
    reset() {
      lastVideo = null;
      lastVideoTime = -1;
      lastDetectAt = -Infinity;
    },
    detect(video) {
      const model = getModel();
      if (!model || !video || video.readyState < 2) return { inferred: false };
      const now = clock();
      if (video === lastVideo && video.currentTime === lastVideoTime && now - lastDetectAt < FRAME_STALE_MS) {
        return { inferred: false };
      }
      const freshVideoFrame = video !== lastVideo || video.currentTime !== lastVideoTime;
      lastVideo = video;
      lastVideoTime = video.currentTime;
      lastDetectAt = now;
      const result = model.detectForVideo(video, now);
      const durationMs = clock() - now;
      const categories = result.faceBlendshapes?.[0]?.categories || null;
      return { inferred: true, freshVideoFrame, categories, eyeGeometry: measureEyes(result.faceLandmarks?.[0], video.videoWidth, video.videoHeight), durationMs, timestamp: now };
    },
  };
}

const sampler = createFaceSampler(() => landmarker);
export const resetFaceTracking = () => sampler.reset();
export const detectFaceFrame = (video) => sampler.detect(video);

// Keep the game's existing categories/null contract and brief result reuse.
export function detectFace(video) {
  return detectFaceFrame(video).categories || null;
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
