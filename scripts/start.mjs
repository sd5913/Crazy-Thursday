import { createServer } from 'node:http';
import { readFile, realpath, rename, rm, stat, writeFile } from 'node:fs/promises';
import { createHash, randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import { setTimeout as delay } from 'node:timers/promises';
import { once } from 'node:events';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../www');
const port = Number(process.env.PORT || 8000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('PORT must be an integer between 1 and 65535.');
  process.exit(1);
}

// Build relative to the repository, not the terminal's working directory.
await import('./build.mjs');
const checkout = await realpath(dirname(root));
const key = createHash('sha256').update(`${process.getuid?.() ?? ''}:${checkout}:${port}`).digest('hex');
const tokenFile = resolve(tmpdir(), `crazy-thursday-${key}.token`);
const token = randomBytes(32).toString('hex');
const restartPath = '/.crazy-thursday/restart';

const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.ttf': 'font/ttf',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.wasm': 'application/wasm',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ico': 'image/x-icon',
};
const server = createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === restartPath && req.headers.authorization === `Bearer ${token}`) {
    res.writeHead(204, { Connection: 'close' }).end(() => server.close());
    return;
  }
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  let path;
  try {
    path = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (path !== root && !path.startsWith(root + sep)) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html');
    const body = await readFile(path);
    res.writeHead(200, {
      'Content-Type': types[extname(path)] || 'application/octet-stream',
      'Content-Length': body.length,
      'Cache-Control': 'no-store',
    });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch (err) {
    const status = err instanceof URIError ? 400 : ['ENOENT', 'ENOTDIR'].includes(err.code) ? 404 : 500;
    res.writeHead(status).end(status === 400 ? 'Bad request' : status === 404 ? 'Not found' : 'Server error');
  }
});
async function listen() {
  const ready = once(server, 'listening');
  server.listen(port, '127.0.0.1');
  await ready;
}

async function requestRestart() {
  try {
    const previousToken = await readFile(tokenFile, 'utf8');
    if (!/^[0-9a-f]{64}$/.test(previousToken)) return false;
    const response = await fetch(`http://127.0.0.1:${port}${restartPath}`, {
      method: 'POST', headers: { Authorization: `Bearer ${previousToken}` },
      signal: AbortSignal.timeout(1000), redirect: 'error',
    });
    await response.body?.cancel();
    return response.status === 204;
  } catch {
    return false;
  }
}

async function start() {
  try {
    await listen();
  } catch (err) {
    if (err.code !== 'EADDRINUSE' || !(await requestRestart())) throw err;
    console.log(`Restarting this checkout's preview on port ${port}...`);
    const deadline = Date.now() + 3000;
    while (true) {
      try {
        await listen();
        break;
      } catch (retryError) {
        if (retryError.code !== 'EADDRINUSE' || Date.now() >= deadline) throw retryError;
        await delay(50);
      }
    }
  }
  // Publish the credential only after binding; never write through an existing temp-file link.
  const pendingToken = `${tokenFile}.${randomBytes(8).toString('hex')}`;
  await writeFile(pendingToken, token, { flag: 'wx', mode: 0o600 });
  try {
    await rename(pendingToken, tokenFile);
  } finally {
    await rm(pendingToken, { force: true });
  }
  server.on('error', (err) => console.error(`Preview server error: ${err.message}`));
  const url = `http://localhost:${port}/`;
  console.log(`Crazy Thursday: ${url}\nKeep this window open. Press Ctrl+C to stop.`);
  console.log('Camera mode needs camera permission and internet for the face model. Demo mode works without a camera.');
  if (process.env.NO_OPEN === '1') return;
  const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'rundll32.exe' : 'xdg-open';
  const args = process.platform === 'win32' ? ['url.dll,FileProtocolHandler', url] : [url];
  const child = spawn(command, args, { stdio: 'ignore' });
  child.on('error', () => console.log(`Open ${url} in your browser.`));
  child.unref();
}

try {
  await start();
} catch (err) {
  server.close();
  console.error(err.code === 'EADDRINUSE'
    ? `Port ${port} is already in use by a server this launcher could not restart. Stop it manually or set PORT to another port.`
    : `Could not start server: ${err.message}`);
  process.exitCode = 1;
}
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close());
}
