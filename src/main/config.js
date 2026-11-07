'use strict';

const path = require('node:path');

// Constantes do app, sem dependência do Electron (testáveis com Node puro).
module.exports = {
  APP_ID: 'com.rocruzta.hub',
  APP_NAME: 'Rocruzta Hub',
  // Pasta de dados em %APPDATA%\Rocruzta Hub (appData do Windows + nome do app).
  userDataDir: (appData) => path.join(appData, 'Rocruzta Hub'),
  WINDOW: { width: 1180, height: 760, minWidth: 880, minHeight: 560 },
  CHANNELS: {
    minimize: 'win:minimize',
    toggleMaximize: 'win:toggle-maximize',
    close: 'win:close',
    isMaximized: 'win:is-maximized',
    maximizedChanged: 'win:maximized-changed',
  },
};
