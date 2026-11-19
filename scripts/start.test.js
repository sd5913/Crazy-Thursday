import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const entry = new URL('./start.mjs', import.meta.url);

test('web launcher rejects invalid ports', async () => {
  const child = spawn(process.execPath, [fileURLToPath(entry)], {
    env: { ...process.env, PORT: 'invalid', NO_OPEN: '1' },
    stdio: 'pipe',
  });
  let error = '';
  child.stderr.on('data', (data) => { error += data; });
  const [code] = await once(child, 'exit');
  assert.equal(code, 1);
  assert.match(error, /PORT must be/);
});

// The launcher syncs src/ into www/ before it starts. Builds are incremental,
// but a cold start on Windows still copies the bundled assets; keep the timeout
// above that worst case under parallel tests.
function launchPreview(t) {
  const child = spawn(process.execPath, [fileURLToPath(entry)], {
    cwd: tmpdir(),
    env: { ...process.env, PORT: '18137', NO_OPEN: '1' },
    stdio: 'pipe',
  });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, 'exit');
      child.kill();
      await exited;
    }
  });
  const ready = new Promise((resolve, reject) => {
    let output = '';
    child.on('error', reject);
    child.once('exit', (code) => reject(new Error(`Server exited early: ${code}`)));
    child.stdout.on('data', (data) => {
      output += data;
      if (output.includes('Crazy Thursday:')) resolve();
    });
  });
  return { child, ready };
}

test('web launcher builds outside repository cwd and serves modules', { timeout: 30000 }, async (t) => {
  await launchPreview(t).ready;
  // The server binds 127.0.0.1 only; the numeric address avoids an IPv6
  // localhost round-trip on every request.
  const base = 'http://127.0.0.1:18137';
  const page = await fetch(base);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /id="demoBtn"/);
  const script = await fetch(`${base}/app.js`);
  assert.match(script.headers.get('content-type'), /javascript/);
  assert.match(await script.text(), /startGame/);
  assert.equal((await fetch(`${base}/missing`)).status, 404);
  assert.equal((await fetch(base, { method: 'POST' })).status, 405);
  assert.equal((await fetch(`${base}/%ZZ`)).status, 400);
});

test('web launcher replaces its own preview but leaves unrelated servers running', { timeout: 30000 }, async (t) => {
  const base = 'http://127.0.0.1:18137';
  const first = launchPreview(t);
  await first.ready;
  assert.equal((await fetch(`${base}/.crazy-thursday/restart`, { method: 'POST' })).status, 405);
  const firstExit = once(first.child, 'exit');
  const replacement = launchPreview(t);
  await replacement.ready;
  assert.deepEqual(await firstExit, [0, null]);
  assert.equal((await fetch(base)).status, 200);

  const replacementExit = once(replacement.child, 'exit');
  replacement.child.kill();
  await replacementExit;
  const other = createServer((_req, res) => res.end('unrelated'));
  t.after(() => new Promise((resolve) => other.close(resolve)));
  other.listen(18137, '127.0.0.1');
  await once(other, 'listening');
  const blocked = launchPreview(t);
  const blockedExit = once(blocked.child, 'exit');
  await assert.rejects(blocked.ready, /exited early: 1/);
  assert.deepEqual(await blockedExit, [1, null]);
  assert.equal(await (await fetch(base)).text(), 'unrelated');
});
