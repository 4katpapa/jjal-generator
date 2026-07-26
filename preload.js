'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  readSpecs: () => ipcRenderer.invoke('specs:read'),
  pickImage: () => ipcRenderer.invoke('image:pick'),
  listDesigns: () => ipcRenderer.invoke('store:list'),
  loadDesign: (file) => ipcRenderer.invoke('store:load', file),
  saveDesign: (payload) => ipcRenderer.invoke('store:save', payload),
  deleteDesign: (file) => ipcRenderer.invoke('store:delete', file),
  exportPng: (arg) => ipcRenderer.invoke('export:png', arg),
  exportWebp: (arg) => ipcRenderer.invoke('export:webp', arg),
  importPng: () => ipcRenderer.invoke('import:png'),
});
