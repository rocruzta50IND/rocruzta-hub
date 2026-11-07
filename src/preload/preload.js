'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// Canais duplicados de config.js de propósito: o preload em sandbox só enxerga `electron`.
// O teste confere que os dois arquivos continuam iguais.
const CH = {
  minimize: 'win:minimize',
  toggleMaximize: 'win:toggle-maximize',
  close: 'win:close',
  isMaximized: 'win:is-maximized',
  maximizedChanged: 'win:maximized-changed',
};

contextBridge.exposeInMainWorld('hub', {
  minimize: () => ipcRenderer.send(CH.minimize),
  toggleMaximize: () => ipcRenderer.send(CH.toggleMaximize),
  close: () => ipcRenderer.send(CH.close),
  isMaximized: () => ipcRenderer.invoke(CH.isMaximized),
  onMaximizedChange: (cb) => {
    const listener = (_e, value) => cb(Boolean(value));
    ipcRenderer.on(CH.maximizedChanged, listener);
    return () => ipcRenderer.removeListener(CH.maximizedChanged, listener);
  },
});
