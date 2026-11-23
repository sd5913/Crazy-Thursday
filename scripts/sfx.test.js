import test from 'node:test';
import assert from 'node:assert/strict';
import { SFX, outcomeSfx, createSfx } from '../src/sfx.js';
import { OUTCOME } from '../src/logic.js';

function fakeAudioFactory(log) {
  return (src) => {
    const a = {
      src, loop: false, paused: true, currentTime: 0,
      play() { log.push({ src, action: 'play', loop: this.loop }); this.paused = false; return Promise.resolve(); },
      pause() { log.push({ src, action: 'pause' }); this.paused = true; },
    };
    return a;
  };
}

test('outcomeSfx: a bite goes in only on accept/surreal-accept/wrong-eat', () => {
  assert.equal(outcomeSfx(OUTCOME.CORRECT_ACCEPT), SFX.EAT);
  assert.equal(outcomeSfx(OUTCOME.SURREAL_ACCEPT), SFX.EAT);
  assert.equal(outcomeSfx(OUTCOME.WRONG_EAT), SFX.EAT);
  assert.equal(outcomeSfx(OUTCOME.CORRECT_REJECT), null);
  assert.equal(outcomeSfx(OUTCOME.SURREAL_REJECT), null);
  assert.equal(outcomeSfx(OUTCOME.DECLINED_FOOD), null);
  assert.equal(outcomeSfx(OUTCOME.DEFENDED), null);
});

test('onServe plays eat once, and starts the looping buzz on a swallowed object', () => {
  const log = [];
  const sfx = createSfx(fakeAudioFactory(log));
  sfx.onServe(OUTCOME.CORRECT_ACCEPT);
  assert.deepEqual(log, [{ src: SFX.EAT, action: 'play', loop: false }]);
  log.length = 0;
  sfx.onServe(OUTCOME.WRONG_EAT);
  assert.deepEqual(log, [
    { src: SFX.EAT, action: 'play', loop: false },
    { src: SFX.WARNING, action: 'play', loop: true },
  ]);
  assert.equal(sfx.warningAudio.loop, true);
});

test('onRescue stops the buzz and plays vomit on success, wrong-eat on failure', () => {
  for (const [success, expected] of [[true, SFX.VOMIT], [false, SFX.WRONG_EAT]]) {
    const log = [];
    const sfx = createSfx(fakeAudioFactory(log));
    sfx.onServe(OUTCOME.WRONG_EAT);
    log.length = 0;
    sfx.onRescue(success);
    assert.deepEqual(log, [
      { src: SFX.WARNING, action: 'pause' },
      { src: expected, action: 'play', loop: false },
    ]);
    assert.equal(sfx.warningAudio, null);
  }
});

test('stopAll clears the looping warning even without a rescue result', () => {
  const log = [];
  const sfx = createSfx(fakeAudioFactory(log));
  sfx.onServe(OUTCOME.WRONG_EAT);
  log.length = 0;
  sfx.stopAll();
  assert.deepEqual(log, [{ src: SFX.WARNING, action: 'pause' }]);
  assert.equal(sfx.warningAudio, null);
});

test('audio failures never throw (missing file, autoplay blocked, no Audio)', () => {
  const throwing = createSfx(() => { throw new Error('no audio'); });
  assert.doesNotThrow(() => throwing.onServe(OUTCOME.WRONG_EAT));
  assert.doesNotThrow(() => throwing.onRescue(true));
  assert.doesNotThrow(() => createSfx(null).onServe(OUTCOME.CORRECT_ACCEPT));
});
