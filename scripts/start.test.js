import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
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

test('web launcher builds outside repository cwd and serves modules', { timeout: 15000 }, async (t) => {
  const child = spawn(process.execPath, [fileURLToPath(entry)], {
    cwd: tmpdir(),
    env: { ...process.env, PORT: '18137', NO_OPEN: '1' },
    stdio: 'pipe',
  });
  t.after(async () => {
    if (child.exitCode === null) {
      const exited = once(child, 'exit');
      child.kill();
      await exited;
    }
  });
  await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.once('exit', (code) => reject(new Error(`Server exited early: ${code}`)));
    child.stdout.on('data', (data) => {
      if (String(data).includes('Crazy Thursday:')) resolve();
    });
  });
  const base = 'http://localhost:18137';
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
