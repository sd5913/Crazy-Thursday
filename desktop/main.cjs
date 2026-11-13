// Electron main process for the desktop build of Expression Feeding.
// Serves the prebuilt www/ folder over http://localhost (a secure context, so
// navigator.mediaDevices.getUserMedia / the camera works) and opens a window.
const { app, BrowserWindow } = require('electron');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const WWW = path.join(__dirname, '..', 'www');
const PORT = Number(process.env.PORT || 8000);

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.ttf': 'font/ttf',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.wasm': 'application/wasm',
};

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (urlPath.endsWith('/')) urlPath += 'index.html';
      const filePath = path.join(WWW, urlPath);
      // Prevent path traversal outside www/.
      if (!filePath.startsWith(WWW)) {
        res.writeHead(403).end('Forbidden');
        return;
      }
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404).end('Not found');
          return;
        }
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(filePath)] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.on('error', reject);
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    backgroundColor: '#162a29',
    title: 'Expression Feeding',
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  win.loadURL(`http://localhost:${PORT}/`);
  if (process.env.DEVTOOLS === '1') win.webContents.openDevTools();
}

app.whenReady().then(async () => {
  await startServer();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
