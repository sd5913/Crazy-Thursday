// Entry point for the expression-feeding game.
// The start buttons provide the user gesture that unlocks the camera.
import { startGame } from './game.js';
import { openFaceDebug, updateGameSettingsLabel } from './face-debug.js';

updateGameSettingsLabel();

let gameStarted = false;
function start(mode) {
  if (gameStarted || !document.getElementById('faceDebug').hidden) return;
  gameStarted = true;
  void startGame(mode);
}

const startBtn = document.getElementById('startBtn');
if (startBtn) {
  startBtn.addEventListener('click', () => start('camera'));
}

const debugBtn = document.getElementById('faceDebugBtn');
if (debugBtn) {
  debugBtn.addEventListener('click', () => {
    if (!gameStarted && document.getElementById('faceDebug').hidden) openFaceDebug();
  });
}

const demoBtn = document.getElementById('demoBtn');
if (demoBtn) {
  demoBtn.addEventListener('click', () => start('demo'));
}
