'use strict';

// Ferramenta de desenvolvimento: gera assets/icone.png (1024x1024, cantos transparentes) a partir de
// src/renderer/icone-hub.svg, a fonte do ícone do app (o "H com chapéu").
// O SVG é desenhado num canvas dentro do Electron, então não depende do tamanho do monitor.
// Uso: npx electron tools/exportar-icone.js
const fs = require('node:fs');
const path = require('node:path');
const { app, BrowserWindow } = require('electron');

const TAM = 1024;
const svg = path.resolve(__dirname, '..', 'src', 'renderer', 'icone-hub.svg');
const saida = path.resolve(__dirname, '..', 'assets', 'icone.png');

app.disableHardwareAcceleration();
app.setPath('userData', path.join(app.getPath('temp'), 'rocruzta-hub-icone'));

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true, sandbox: true } });
  await win.loadURL('data:text/html;charset=utf-8,<body></body>');
  const dataUrl = 'data:image/svg+xml;base64,' + fs.readFileSync(svg).toString('base64');
  const png = await win.webContents.executeJavaScript(`new Promise((ok, erro) => {
    const img = new Image();
    img.onload = () => { const c = document.createElement('canvas'); c.width = c.height = ${TAM}; c.getContext('2d').drawImage(img, 0, 0, ${TAM}, ${TAM}); ok(c.toDataURL('image/png')); };
    img.onerror = () => erro(new Error('SVG não carregou'));
    img.src = ${JSON.stringify(dataUrl)};
  })`);
  fs.writeFileSync(saida, Buffer.from(png.split(',')[1], 'base64'));
  console.log('gerado', saida);
  app.quit();
});
