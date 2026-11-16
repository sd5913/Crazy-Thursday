// Entry point for the expression-feeding game.
// The start buttons provide the user gesture that unlocks the camera.
import { startGame } from './game.js';
import { openFaceDebug, updateGameSettingsLabel } from './face-debug.js';
import { toggleLanguage, applyI18nDom, onLanguageChange, t } from './i18n.js';

// Apply the saved (or browser-detected) language to every static text.
applyI18nDom();
const langBtn = document.getElementById('langBtn');
function renderLangButton() {
  if (!langBtn) return;
  langBtn.textContent = t('langButton');
  langBtn.setAttribute('aria-label', t('langButtonAria'));
}
renderLangButton();
langBtn?.addEventListener('click', () => toggleLanguage());
onLanguageChange(() => {
  applyI18nDom();
  renderLangButton();
  updateGameSettingsLabel();
});

updateGameSettingsLabel();

let gameStarted = false;
function start(mode) {
  if (gameStarted || !document.getElementById('faceDebug').hidden) return;
  gameStarted = true;
  void startGame(mode);
}

document.getElementById('startBtn')?.addEventListener('click', () => start('camera'));
document.getElementById('demoBtn')?.addEventListener('click', () => start('demo'));
document.getElementById('faceDebugBtn')?.addEventListener('click', () => {
  if (gameStarted || !document.getElementById('faceDebug').hidden) return;
  openFaceDebug();
});
