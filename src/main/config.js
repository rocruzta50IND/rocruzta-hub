'use strict';

const path = require('node:path');

// Constantes do app, sem dependência do Electron (testáveis com Node puro).
module.exports = {
  APP_ID: 'com.rocruzta.hub',
  APP_NAME: 'Rocruzta Hub',
  // Ícone da janela e da barra de tarefas (PNG 1024x1024, pétalas azuis).
  ICON: path.join(__dirname, '..', '..', 'assets', 'icone.png'),
  // Pasta de dados em %APPDATA%\Rocruzta Hub (appData do Windows + nome do app).
  userDataDir: (appData) => path.join(appData, 'Rocruzta Hub'),
  WINDOW: { width: 1180, height: 760, minWidth: 880, minHeight: 560 },
  CHANNELS: {
    minimize: 'win:minimize',
    toggleMaximize: 'win:toggle-maximize',
    close: 'win:close',
    isMaximized: 'win:is-maximized',
    maximizedChanged: 'win:maximized-changed',
    apps: 'apps:list',
  },
};
