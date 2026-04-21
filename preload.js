const { contextBridge, ipcRenderer } = require('electron');

// Exposition sécurisée d'APIs vers le frontend
contextBridge.exposeInMainWorld('electronAPI', {
    platform: process.platform,
    onBackendLog: (callback) => ipcRenderer.on('backend-log', (event, data) => callback(data))
});

console.log('Preload script chargé avec succès.');
