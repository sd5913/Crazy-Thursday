// Entry point for the expression-feeding game.
// The start buttons provide the user gesture that unlocks the camera.
import { startGame } from './game.js';

const startBtn = document.getElementById('startBtn');
if (startBtn) {
  startBtn.addEventListener('click', () => startGame('camera'));
}

const demoBtn = document.getElementById('demoBtn');
if (demoBtn) {
  demoBtn.addEventListener('click', () => startGame('demo'));
}
