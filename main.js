// main.js  –  Electron main process
const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path   = require('path');
const fs     = require('fs');

// ── Data directory (all portfolio JSON files live here) ───────────────────────
const DATA_DIR = path.join(app.getPath('documents'), 'Portfolio');
const isDev  = process.env.NODE_ENV === 'development';

// ── Auto-updater (electron-updater) ──────────────────────────────────────────
// Only active in production builds. Requires the "publish" key in package.json
// pointing at your GitHub releases page. Tag your releases as vX.Y.Z.
let autoUpdater;
try {
  autoUpdater = require('electron-updater').autoUpdater;
  autoUpdater.autoDownload       = true;   // download silently in background
  autoUpdater.autoInstallOnAppQuit = false; // we'll ask the user first
} catch (e) {
  // electron-updater not installed yet (dev environment) — safe to ignore
}

let mainWindow;
let _readyToClose = false; // set true once renderer confirms flush is done

function createWindow() {
  // Fill the primary display by default (respects multi-monitor setups)
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width,
    height,
    minWidth:  900,
    minHeight: 600,
    frame:     false,          // Custom Orbitron title bar drawn in React
    show:      false,          // Avoid white flash before content loads
    backgroundColor: '#0a0a0a',
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      nodeIntegration:  false,
      contextIsolation: true,
    },
  });

  // Show once ready — removes the white flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // Start maximised but don't go full-screen (user can resize)
    mainWindow.maximize();
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, 'build', 'index.html'));
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow.webContents.closeDevTools();
    });
  }
  // ── Graceful-close: intercept close, ask renderer to flush, then close ──────
  mainWindow.on('close', (e) => {
    if (!_readyToClose) {
      e.preventDefault();                                    // pause the close
      mainWindow.webContents.send('app-closing');            // tell renderer
    }
  });
}

// ── Window control IPC ────────────────────────────────────────────────────────
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.on('window-close', () => mainWindow?.close());

// ── Auto-update IPC ───────────────────────────────────────────────────────────
ipcMain.on('install-update', () => {
  autoUpdater?.quitAndInstall(false, true);
});

// ── Flush-complete handshake ──────────────────────────────────────────────────
// Renderer calls this after it has flushed all pending storage writes to disk.
ipcMain.on('flush-complete', () => {
  _readyToClose = true;
  mainWindow?.close();   // re-trigger close — this time _readyToClose is true
});

// ── File-based storage IPC ────────────────────────────────────────────────────
// Ensures the Portfolio directory exists, then reads/writes <key>.json files.
ipcMain.handle('storage-read', async (_event, key) => {
  try {
    if (!fs.existsSync(DATA_DIR)) await fs.promises.mkdir(DATA_DIR, { recursive: true });
    const file = path.join(DATA_DIR, `${key}.json`);
    if (!fs.existsSync(file)) return null;
    return await fs.promises.readFile(file, 'utf8');
  } catch (e) {
    console.error('storage-read error:', e);
    return null;
  }
});

ipcMain.handle('storage-write', async (_event, key, value) => {
  try {
    if (!fs.existsSync(DATA_DIR)) await fs.promises.mkdir(DATA_DIR, { recursive: true });
    const file = path.join(DATA_DIR, `${key}.json`);
    await fs.promises.writeFile(file, value, 'utf8');
    return true;
  } catch (e) {
    console.error('storage-write error:', e);
    return false;
  }
});

ipcMain.handle('file-save', async (_event, name, data) => {
  try {
    if (!fs.existsSync(DATA_DIR)) await fs.promises.mkdir(DATA_DIR, { recursive: true });
    const file = path.join(DATA_DIR, name);
    await fs.promises.writeFile(file, data, 'utf8');
    return true;
  } catch (e) {
    console.error('file-save error:', e);
    return false;
  }
});

ipcMain.handle('net-fetch', async (_event, url, options = {}) => {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://finance.yahoo.com/',
        ...(options.headers || {})
      }
    });
    if (!response.ok) return null;
    return await response.text();
  } catch (e) {
    console.error('net-fetch error:', e);
    return null;
  }
});

ipcMain.handle('scrape-investing', async (_event, symbol) => {
  try {
    const ticker = symbol.split('.')[0];
    const searchUrl = `https://in.investing.com/search/?q=${encodeURIComponent(ticker)}`;
    const searchRes = await fetch(searchUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
    });
    if (!searchRes.ok) return null;
    const searchHtml = await searchRes.text();
    
    // Find the first equity link in search results
    const linkMatch = searchHtml.match(/href="(\/equities\/[^"]+)"/);
    if (!linkMatch) return null;
    
    const equityUrl = `https://in.investing.com${linkMatch[1]}`;
    const equityRes = await fetch(equityUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
    });
    if (!equityRes.ok) return null;
    const html = await equityRes.text();
    
    const out = {};
    // Market Cap
    const mcMatch = html.match(/Market Cap<\/dt>\s*<dd[^>]*>\s*(?:<a[^>]*>)?\s*<span>([^<]+)<\/span>\s*<span>([^<]+)<\/span>/i);
    if(mcMatch) {
      let val = parseFloat(mcMatch[1]);
      const unit = mcMatch[2].toUpperCase();
      if(unit === 'T') val *= 1e12;
      else if(unit === 'B') val *= 1e9;
      else if(unit === 'M') val *= 1e6;
      else if(unit === 'CR') val *= 1e7;
      out.marketCap = val;
    }
    // P/E Ratio
    const peMatch = html.match(/P\/E Ratio<\/dt>\s*<dd[^>]*>\s*(?:<a[^>]*>)?\s*<span>([^<]+)<\/span>/i);
    if(peMatch) out.pe = parseFloat(peMatch[1]);
    // EPS
    const epsMatch = html.match(/EPS<\/dt>\s*<dd[^>]*>\s*(?:<a[^>]*>)?\s*<span>([^<]+)<\/span>/i);
    if(epsMatch) out.eps = parseFloat(epsMatch[1]);
    // Div Yield
    const divMatch = html.match(/Dividend[^<]*<\/dt>\s*<dd[^>]*>\s*(?:<a[^>]*>)?\s*<span>([^<]+)<\/span>/i);
    if(divMatch) {
      const p = divMatch[1].match(/\(([^%]+)%\)/);
      if(p) out.divYield = parseFloat(p[1]) / 100;
    }
    return out;
  } catch (e) {
    console.error('scrape-investing error:', e);
    return null;
  }
});

ipcMain.handle('scrape-mc-nps', async (_event, url) => {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
    });
    if (!res.ok) return null;
    const html = await res.text();
    // Moneycontrol NPS pages usually have the NAV in the <title> like [70.4217]
    const match = html.match(/<title>[^\]]*\[([0-9]+\.[0-9]+)\][^<]*<\/title>/i);
    if (match) return parseFloat(match[1]);
    
    // Fallback: search for nav value in span with class "span_764" or similar if title fails
    // But title is usually very reliable on MC for NPS
    const spanMatch = html.match(/class="span_764"[^>]*>([0-9]+\.[0-9]+)<\/span>/i);
    if (spanMatch) return parseFloat(spanMatch[1]);

    return null;
  } catch (e) {
    console.error('scrape-mc-nps error:', e);
    return null;
  }
});

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();

  // Start update check 3 seconds after launch (non-blocking)
  if (autoUpdater && !isDev) {
    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify().catch(() => {});
    }, 3000);

    autoUpdater.on('update-available', () => {
      mainWindow?.webContents.send('update-available');
    });

    autoUpdater.on('update-downloaded', () => {
      mainWindow?.webContents.send('update-downloaded');
    });
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
