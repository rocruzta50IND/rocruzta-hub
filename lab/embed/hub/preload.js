const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('hub', {
  lista: () => ipcRenderer.invoke('lista'),
  abrir: (id) => ipcRenderer.invoke('abrir', id),
  instalar: (id) => ipcRenderer.invoke('instalar', id),
  desinstalar: (id) => ipcRenderer.invoke('desinstalar', id),
  reiniciar: (id) => ipcRenderer.invoke('reiniciar', id),
  aoMudar: (cb) => ipcRenderer.on('mudou', () => cb()),
});
