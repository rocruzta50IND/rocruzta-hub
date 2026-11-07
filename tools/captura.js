'use strict';

// Ferramenta de desenvolvimento: tira screenshot de uma página dentro do Electron
// (o vidro depende do motor do app, então a comparação não vale em outro navegador).
// Uso: npx electron tools/captura.js <arquivo.html> <saida.png> [claro|escuro] [largura] [altura]
const path = require('node:path');
const { app, BrowserWindow } = require('electron');

const [file, out, theme = 'escuro', w = '1180', h = '760'] = process.argv.slice(2);
if (!file || !out) {
  console.error('uso: electron tools/captura.js <arquivo.html> <saida.png> [claro|escuro] [largura] [altura]');
  process.exit(2);
}

app.disableHardwareAcceleration();
app.setPath('userData', path.join(app.getPath('temp'), 'rocruzta-hub-captura'));

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: Number(w), height: Number(h), show: false, frame: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  await win.loadFile(path.resolve(file));
  if (theme === 'claro') {
    await win.webContents.executeJavaScript("document.documentElement.setAttribute('data-theme','light')");
  }
  await new Promise((r) => setTimeout(r, 1500)); // fontes e vidro assentarem
  const img = await win.webContents.capturePage();
  require('node:fs').writeFileSync(path.resolve(out), img.toPNG());
  app.quit();
});
