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

export async function initFaceLandmarker() {
  if (landmarker) return landmarker;
  const { FaceLandmarker, FilesetResolver } = await import(VISION_URL);
  const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
  landmarker = await FaceLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
    runningMode: 'VIDEO',
    numFaces: 1,
    outputFaceBlendshapes: true,
  });
  return landmarker;
}

// Returns the blendshape categories array for the current video frame, or null
// when no (new) face is found. Caller passes the <video> element.
export function detectFace(video) {
  if (!landmarker || !video || video.readyState < 2) return null;
  if (video.currentTime === lastVideoTime) return null; // no new frame yet
  lastVideoTime = video.currentTime;
  const result = landmarker.detectForVideo(video, performance.now());
  if (result.faceBlendshapes && result.faceBlendshapes.length > 0) {
    return result.faceBlendshapes[0].categories;
  }
  return null;
}

// Open the local webcam. Resolves with the MediaStream on success.
export async function openCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('此环境不支持摄像头（getUserMedia 不可用）。');
  }
  return navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: 640, height: 480 },
    audio: false,
  });
}
