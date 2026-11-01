// Entry point for the expression-feeding game.
// The start button is the user gesture that unlocks the camera.
import { startGame } from './game.js';

const startBtn = document.getElementById('startBtn');
if (startBtn) {
  startBtn.addEventListener('click', () => startGame());
}
