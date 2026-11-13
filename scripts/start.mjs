import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
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
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.ttf': 'font/ttf',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.wasm': 'application/wasm',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ico': 'image/x-icon',
};
const server = createServer(async (req, res) => {
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
server.on('error', (err) => {
  console.error(err.code === 'EADDRINUSE'
    ? `Port ${port} is already in use. Close the other server or set PORT to another port.`
    : `Could not start server: ${err.message}`);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => {
  const url = `http://localhost:${port}/`;
  console.log(`Crazy Thursday: ${url}\nKeep this window open. Press Ctrl+C to stop.`);
  console.log('Camera mode needs camera permission and internet for the face model. Demo mode works without a camera.');
  if (process.env.NO_OPEN === '1') return;
  const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'rundll32.exe' : 'xdg-open';
  const args = process.platform === 'win32' ? ['url.dll,FileProtocolHandler', url] : [url];
  const child = spawn(command, args, { stdio: 'ignore' });
  child.on('error', () => console.log(`Open ${url} in your browser.`));
  child.unref();
});
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close());
}
