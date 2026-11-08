'use strict';

const path = require('node:path');
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const { carregarCatalogo, urlReleases } = require('./apps');
const { detectarApps } = require('./deteccao');
const { anexarExecucao, abrirApp } = require('./execucao');
const { APP_ID, APP_NAME, ICON, WINDOW, CHANNELS, userDataDir } = require('./config');

// Dados do usuário em %APPDATA%\Rocruzta Hub (antes de qualquer outro uso do app).
app.setPath('userData', userDataDir(app.getPath('appData')));
app.setAppUserModelId(APP_ID);

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    ...WINDOW,
    title: APP_NAME,
    icon: ICON,
    frame: false,
    show: false,
    backgroundColor: '#0d0d0e',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('maximize', sendMaximized);
  mainWindow.on('unmaximize', sendMaximized);
  mainWindow.on('closed', () => { mainWindow = null; });
  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
}

function sendMaximized() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(CHANNELS.maximizedChanged, mainWindow.isMaximized());
  }
}

// Só valem comandos vindos da janela do Hub.
function windowFrom(event) {
  const win = BrowserWindow.fromWebContents(event.sender);
  return win && win === mainWindow ? win : null;
}

ipcMain.on(CHANNELS.minimize, (e) => windowFrom(e)?.minimize());
ipcMain.on(CHANNELS.toggleMaximize, (e) => {
  const win = windowFrom(e);
  if (win) win.isMaximized() ? win.unmaximize() : win.maximize();
});
ipcMain.on(CHANNELS.close, (e) => windowFrom(e)?.close());
ipcMain.handle(CHANNELS.isMaximized, (e) => windowFrom(e)?.isMaximized() ?? false);
ipcMain.handle(CHANNELS.apps, (e) => (windowFrom(e) ? carregarCatalogo() : null));
ipcMain.handle(CHANNELS.detectar, async (e) => {
  if (!windowFrom(e)) return null;
  try {
    const apps = carregarCatalogo().apps;
    return await anexarExecucao(apps, await detectarApps(apps));
  } catch { return null; }
});
// Abre pelo id do catálogo; o executável vem da detecção no registro, nunca da janela.
ipcMain.handle(CHANNELS.abrir, async (e, id) => {
  if (!windowFrom(e)) return { ok: false, motivo: 'janela' };
  try {
    const a = carregarCatalogo().apps.find((x) => x.id === id);
    if (!a) return { ok: false, motivo: 'desconhecido' };
    return await abrirApp((await detectarApps([a]))[a.id]);
  } catch { return { ok: false, motivo: 'falha' }; }
});
// A página de releases sai do catálogo (repositório do app), nunca de um endereço vindo da janela.
ipcMain.handle(CHANNELS.releases, async (e, id) => {
  if (!windowFrom(e)) return false;
  const a = carregarCatalogo().apps.find((x) => x.id === id);
  if (!a) return false;
  await shell.openExternal(urlReleases(a));
  return true;
});

// Instância única: abrir de novo traz a janela existente para a frente.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });
  app.whenReady().then(createWindow);
  app.on('window-all-closed', () => app.quit());
}
