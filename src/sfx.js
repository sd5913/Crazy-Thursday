// Small sound-effects layer. Browser Audio is injected so the mapping can be
// unit-tested in Node; game.js passes a factory that creates `new Audio(src)`.

export const SFX = {
  EAT: 'assets/eat-01.mp3',
  WARNING: 'assets/warning-01-buzz.mp3',
  VOMIT: 'assets/vomit-02-stock.mp3',
  WRONG_EAT: 'assets/wrong-eat-01.mp3',
};

// A bite actually went in when the player smiled at good/surreal food, or
// failed to refuse a foreign object. Refusals, defence and no-expression
// declines are not "eaten" and stay silent.
export function outcomeSfx(outcomeType) {
  if (outcomeType === 'correctAccept'
    || outcomeType === 'surrealAccept'
    || outcomeType === 'wrongEat') return SFX.EAT;
  return null;
}

export function createSfx(audioFactory) {
  let warning = null;
  const make = (src) => {
    if (typeof audioFactory !== 'function') return null;
    try { return audioFactory(src); } catch { return null; }
  };
  const play = (src, loop = false) => {
    const audio = make(src);
    if (!audio) return null;
    try {
      audio.loop = loop;
      const p = audio.play();
      if (p && typeof p.catch === 'function') p.catch(() => {}); // autoplay policy
    } catch { /* audio is optional; never block gameplay */ }
    return audio;
  };
  const stop = (audio) => {
    if (!audio) return;
    try { audio.pause(); audio.currentTime = 0; } catch { /* ignore */ }
  };
  return {
    play,
    // A swallowed foreign object makes the eat sound AND enters the rescue
    // window with the looping buzz.
    onServe(outcomeType) {
      const oneShot = outcomeSfx(outcomeType);
      if (oneShot) play(oneShot); // the bite going in: eat-01.mp3
      if (outcomeType === 'wrongEat') {
        stop(warning);
        warning = play(SFX.WARNING, true); // buzz for the whole rescue window
      }
    },
    onRescue(success) {
      stop(warning);
      warning = null;
      play(success ? SFX.VOMIT : SFX.WRONG_EAT);
    },
    stopAll() {
      stop(warning);
      warning = null;
    },
    get warningAudio() { return warning; },
  };
}
