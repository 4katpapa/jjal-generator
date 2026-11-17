'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// 화면 쪽에는 꼭 필요한 두 가지만 내준다.
contextBridge.exposeInMainWorld('jjal', {
  readSpecs: () => ipcRenderer.invoke('specs:read'),
  listFonts: () => ipcRenderer.invoke('fonts:list'),
});
