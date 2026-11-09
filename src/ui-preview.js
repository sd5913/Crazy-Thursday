// Isolated UI study. Reuses repository rules; does not change camera detection.
import { ITEMS, INTENT, OUTCOME, SCORING, judge, applyRescue, speedForLevel } from './logic.js';

const $ = id => document.getElementById(id);
const app = $('app');
const modal = $('modal');
const screens = ['menu', 'prepare', 'play', 'report'];
let screen = 'menu';
let game = null;
let action = null;
let previousTime = 0;
let paused = false;
let session = 0;
let cameraStream = null;
let cameraToken = 0;
let cameraPending = false;

function stopPatientCamera() {
  cameraToken++;
  cameraStream?.getTracks().forEach(track => track.stop());
  cameraStream = null;
  cameraPending = false;
  $('patientCamera').srcObject = null;
  $('cameraPlaceholder').hidden = false;
  $('cameraState').textContent = 'OFFLINE';
  $('faceValue').textContent = 'CAMERA OFF';
  $('faceDetail').textContent = 'Camera display only · keyboard controls';
  $('cameraToggle').textContent = 'ENABLE CAMERA';
  $('cameraToggle').disabled = false;
}

async function enablePatientCamera() {
  if (cameraStream || cameraPending) { stopPatientCamera(); return; }
  const token = ++cameraToken;
  cameraPending = true;
  $('cameraToggle').textContent = 'CANCEL CAMERA';
  $('cameraState').textContent = 'CONNECTING';
  try {
    const { openCamera, initFaceLandmarker, detectFace } = await import('./face.js');
    const stream = await openCamera();
    if (token !== cameraToken || !['play', 'prepare'].includes(screen)) { stream.getTracks().forEach(track => track.stop()); return; }
    cameraStream = stream;
    const video = $('patientCamera');
    video.srcObject = stream;
    await video.play();
    if (token !== cameraToken) return;
    $('cameraPlaceholder').hidden = true;
    $('cameraState').textContent = 'LIVE';
    $('faceValue').textContent = 'LOADING DETECTOR';
    $('cameraToggle').textContent = 'DISABLE CAMERA';
    $('faceDetail').textContent = 'Downloading face model…';
    try { await initFaceLandmarker(); } catch {
      if (token !== cameraToken) return;
      cameraPending = false;
      $('faceValue').textContent = 'PREVIEW ONLY';
      $('faceDetail').textContent = 'Detector unavailable. Retry camera or use S / F / V.';
      return;
    }
    if (token !== cameraToken) return;
    cameraPending = false;
    let lastFrame = -1;
    let lastSample = 0;
    function observe(now) {
      if (token !== cameraToken || !cameraStream) return;
      try {
        if (now - lastSample > 100 && video.readyState >= 2 && video.currentTime !== lastFrame) {
          lastSample = now;
          lastFrame = video.currentTime;
          const categories = detectFace(video);
          const value = name => categories?.find(c => c.categoryName === name)?.score ?? 0;
          const jaw = value('jawOpen');
          const smile = (value('mouthSmileLeft') + value('mouthSmileRight')) / 2;
          $('faceValue').textContent = !categories ? 'NO FACE DETECTED' : jaw > .25 ? 'MOUTH OPEN' : smile > .4 ? 'SMILING' : 'MOUTH CLOSED';
          $('faceDetail').textContent = categories ? 'Live mouth/smile estimate · S / F / V control game' : 'Face the camera in good light';
        }
      } catch {
        $('faceValue').textContent = 'PREVIEW ONLY';
        $('faceDetail').textContent = 'Detection interrupted. Disable and retry camera.';
        return;
      }
      requestAnimationFrame(observe);
    }
    requestAnimationFrame(observe);
  } catch {
    if (token !== cameraToken) return;
    stopPatientCamera();
    $('cameraState').textContent = 'UNAVAILABLE';
    $('faceValue').textContent = 'CAMERA NOT READY';
    $('faceDetail').textContent = 'Check permission/device. Keyboard demo still works.';
  }
}
$('cameraToggle').addEventListener('click', enablePatientCamera);
window.addEventListener('pagehide', stopPatientCamera);
const timeText = milliseconds => {
  const seconds = Math.floor(milliseconds / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};

function showScreen(name) {
  if (!['play', 'prepare'].includes(name)) stopPatientCamera();
  document.querySelector('.camera-window').hidden = !['play', 'prepare'].includes(name);
  session++;
  screen = name;
  screens.forEach(id => $(id).hidden = id !== name);
  app.dataset.screen = name;
  app.dataset.phase = '';
  $('menuQuote').hidden = name !== 'menu';
  action = null;
  if (name !== 'play') game = null;
  requestAnimationFrame(() => $(name).querySelector('button')?.focus({ preventScroll: true }));
}

function openModal(title, html) {
  $('modalTitle').textContent = title;
  $('modalBody').innerHTML = html;
  if (!modal.open) modal.showModal();
}

function start() {
  showScreen('play');
  paused = false;
  game = { score: 0, nausea: 0, elapsed: 0, wrong: 0, rescues: 0, round: 0, level: 0, remaining: 0, phase: 'serving' };
  nextBite();
  meters();
  const token = session;
  previousTime = performance.now();
  function frame(now) {
    if (token !== session || !game) return;
    const delta = now - previousTime;
    previousTime = now;
    if (!paused) update(delta);
    if (token === session) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function nextBite() {
  game.round++;
  // Two teaching rounds, then the existing catalogue's random distribution.
  game.item = game.round === 1 ? ITEMS[0] : game.round === 2 ? ITEMS[6] : ITEMS[Math.floor(Math.random() * ITEMS.length)];
  game.phase = 'serving';
  game.duration = speedForLevel(game.level).travelMs;
  game.remaining = game.duration;
  $('itemName').textContent = game.item.name.toUpperCase();
  $('foodImage').src = ['congee', 'pudding', 'cactus'].includes(game.item.id) ? `assets/ui-food/${game.item.id}.png` : game.item.image;
  $('foodImage').alt = game.item.name;
  $('dialogueText').textContent = game.item.line;
  $('round').textContent = `BITE ${String(game.round).padStart(2, '0')}`;
  $('phaseLabel').textContent = 'NEXT BITE';
  $('prop').hidden = false;
  $('rescue').hidden = true;
  app.dataset.phase = 'serving';
}

function meters() {
  $('scoreValue').textContent = String(game.score).padStart(3, '0');
  $('nauseaValue').textContent = `${game.nausea} / ${SCORING.MAX_DISCOMFORT}`;
  $('nauseaFill').style.width = `${game.nausea}%`;
}

function feedback(text) {
  game.phase = 'result';
  game.remaining = 1000;
  app.dataset.phase = 'result';
  $('dialogueText').textContent = text;
  $('phaseLabel').textContent = 'OBSERVATION';
  $('prop').hidden = true;
  $('rescue').hidden = true;
  meters();
}

function takeBite() {
  const result = judge(game.item, action === 'accept' ? INTENT.ACCEPT : action === 'refuse' ? INTENT.REJECT : INTENT.NEUTRAL);
  game.score += result.scoreDelta;
  game.nausea = Math.min(SCORING.MAX_DISCOMFORT, game.nausea + result.discomfortDelta);
  meters();
  if (result.type === OUTCOME.WRONG_EAT) {
    game.wrong++;
    game.level = Math.max(0, game.level - 1);
    game.phase = 'rescue';
    game.duration = game.remaining = 2500;
    app.dataset.phase = 'rescue';
    $('rescue').hidden = false;
    $('phaseLabel').textContent = 'FEEDING PAUSED';
    $('dialogueText').textContent = 'Changed your mind? A little late.';
    // A fresh key press is required after the rescue starts.
    return;
  }
  if (result.type === OUTCOME.CORRECT_ACCEPT || result.type === OUTCOME.CORRECT_REJECT) game.level++;
  feedback(result.type === OUTCOME.CORRECT_ACCEPT ? 'A model patient. +10 points.' : result.type === OUTCOME.CORRECT_REJECT ? 'Refused. Your survival instincts are improving. +10.' : 'You declined the food. The kitchen will be devastated.');
}

function rescue(success) {
  if (!game || paused || game.phase !== 'rescue') return;
  game.nausea = applyRescue(game.nausea, success);
  if (success) game.rescues++;
  feedback(success ? 'Recovered. We will leave that off your chart.' : 'Too late. That is staying on your chart.');
}

function finish() {
  const result = { ...game };
  showScreen('report');
  $('finalScore').textContent = String(result.score).padStart(3, '0');
  $('finalTime').textContent = timeText(result.elapsed);
  $('finalWrong').textContent = result.wrong;
  $('finalRescues').textContent = result.rescues;
}

function update(delta) {
  game.elapsed += delta;
  game.remaining = Math.max(0, game.remaining - delta);
  $('elapsed').textContent = timeText(game.elapsed);
  $('inputValue').textContent = action === 'accept' ? '▰ ACCEPTING' : action === 'refuse' ? '━ REFUSING' : action === 'rescue' ? '▼ RESCUE' : '— WAITING';
  if (game.phase === 'serving') {
    const progress = 1 - game.remaining / game.duration;
    $('biteFill').style.width = `${(1 - progress) * 100}%`;
    $('biteTime').textContent = `${(game.remaining / 1000).toFixed(1)}s`;
    $('prop').style.setProperty('--approach', String(.92 + progress * .08));
    if (!game.remaining) takeBite();
  } else if (game.phase === 'rescue') {
    $('rescueTime').textContent = `${(game.remaining / 1000).toFixed(1)}s`;
    $('rescueFill').style.width = `${game.remaining / game.duration * 100}%`;
    if (!game.remaining) rescue(false);
  } else if (game.phase === 'result' && !game.remaining) {
    if (game.nausea >= SCORING.MAX_DISCOMFORT) finish();
    else nextBite();
  }
}

function pause() {
  if (!game || paused) return;
  paused = true;
  action = null;
  openModal('FEEDING SUSPENDED', '<h2>Take a breath.</h2><p>Your lunch can wait. For once.</p><div class="button-row"><button class="primary" data-action="resume">RESUME →</button><button data-action="finish">END SESSION</button><button data-action="leave">MAIN MENU</button></div>');
}
modal.addEventListener('close', () => { paused = false; previousTime = performance.now(); action = null; });
$('closeModal').addEventListener('click', () => modal.close());
$('pauseButton').addEventListener('click', pause);
document.addEventListener('click', event => {
  const command = event.target.closest('[data-action]')?.dataset.action;
  if (command === 'prepare') showScreen('prepare');
  if (command === 'menu') showScreen('menu');
  if (command === 'play') start();
  if (command === 'instructions') openModal('PATIENT HANDBOOK', '<h2>Your face. Your fate.</h2><p><kbd>S</kbd> Hold to accept food.<br><kbd>F</kbd> Hold to refuse strange objects.<br><kbd>V</kbd> Press during recovery to rescue yourself.</p><p>Correct decisions earn 10 points. A wrong bite adds 25 nausea. Rescue removes 15; a failed rescue adds 10 more. At 100 nausea, the session ends.</p><p>This is a keyboard UI preview. The current camera implementation is available from the intake page; its expression mapping has not been changed.</p>');
  if (command === 'credits') openModal('STAFF RECORDS', '<h2>The care team.</h2><p>DAI Yu / Game flow<br>OUYANG Can / System integration<br>REN Liuyue / Game planning<br>ZENG Dezhen / Game art</p><p>UI study: existing 3D artwork + pixel-inspired interface.</p>');
  if (command === 'resume') modal.close();
  if (command === 'finish') { modal.close(); finish(); }
  if (command === 'leave') { modal.close(); showScreen('menu'); }
});
const keys = { s: 'accept', f: 'refuse', v: 'rescue' };
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !modal.open && game) { event.preventDefault(); pause(); return; }
  if (screen !== 'play' || paused || modal.open || !keys[event.key.toLowerCase()]) return;
  event.preventDefault();
  action = keys[event.key.toLowerCase()];
  if (action === 'rescue' && !event.repeat) rescue(true);
});
document.addEventListener('keyup', event => { if (keys[event.key.toLowerCase()] === action) action = null; });
window.addEventListener('blur', () => { action = null; if (game && !paused) pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && game && !paused) pause(); });
let reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
function motionLabel() { app.classList.toggle('reduce-motion', reduced); $('motion').textContent = `MOTION: ${reduced ? 'OFF' : 'ON'}`; $('motion').setAttribute('aria-pressed', String(reduced)); }
$('motion').addEventListener('click', () => { reduced = !reduced; motionLabel(); });
motionLabel();

let interfaceSound = false;
let audioContext;
$('soundButton').addEventListener('click', () => {
  interfaceSound = !interfaceSound;
  $('soundButton').setAttribute('aria-pressed', String(interfaceSound));
  $('soundButton').setAttribute('aria-label', interfaceSound ? 'Mute interface sounds' : 'Enable interface sounds');
});
document.addEventListener('click', event => {
  if (!interfaceSound || !event.target.closest('button, .layout-button')) return;
  try {
    audioContext ??= new AudioContext();
    audioContext.resume();
    const tone = audioContext.createOscillator(); const volume = audioContext.createGain();
    tone.type = 'square'; tone.frequency.value = 440;
    volume.gain.setValueAtTime(.025, audioContext.currentTime);
    volume.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + .05);
    tone.connect(volume);volume.connect(audioContext.destination);tone.start();tone.stop(audioContext.currentTime + .06);
  } catch { /* Audio support is optional; gameplay remains available. */ }
});
$('settingsButton').addEventListener('click', () => {
  if (game && !paused) paused = true;
  openModal('SETTINGS', `<h2>A moment, please.</h2><p>Interface animations and sound.</p><div class="pause-options"><button id="settingsMotion" type="button">${$('motion').textContent}</button><button id="settingsSound" type="button">SOUND: ${interfaceSound ? 'ON' : 'OFF'}</button>${game ? '<button data-action="resume">RESUME FEEDING →</button>' : ''}</div>`);
  $('settingsMotion').addEventListener('click', () => { $('motion').click(); $('settingsMotion').textContent = $('motion').textContent; });
  $('settingsSound').addEventListener('click', () => { $('soundButton').click(); $('settingsSound').textContent = `SOUND: ${interfaceSound ? 'ON' : 'OFF'}`; });
});

// Review routes freeze individual full-screen layouts, without starting a game.
if (new URLSearchParams(location.search).has('layout')) {
  import('./ui-layouts.js').then(({ mountLayout }) => mountLayout({ showScreen, openModal }));
}
