const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

let logBuffer = [];
let isWindowReady = false;

/**
 * Envoie un log système vers la console du renderer pour visibilité
 */
global.systemLog = function(message, type = 'info') {
    const logEntry = { message, type };
    if (isWindowReady && mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('backend-log', logEntry);
    } else {
        logBuffer.push(logEntry);
    }
}

/**
 * Charge le backend directement dans le processus principal
 */
function startBackend() {
    global.systemLog('Intégration du backend NutriApp...');
    try {
        require('./backend/index.js');
        global.systemLog('Backend Express chargé avec succès.', 'success');
    } catch (err) {
        global.systemLog(`Erreur critique backend : ${err.stack}`, 'error');
    }
}

/**
 * Crée la fenêtre principale de l'application
 */
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1300,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        title: "NutriApp - Nutrition Intelligente & Sécurisée",
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        backgroundColor: '#f7f1e8',
        show: false
    });

    // Supprime la barre de menu (File, Edit, View, etc.)
    mainWindow.removeMenu();
    // Alternative radicale : Menu.setApplicationMenu(null);

    // On ouvre les outils de dév pour pouvoir debugger en cas de problème de connexion
    // mainWindow.webContents.openDevTools();

    mainWindow.loadFile('index.html');

    // Vidage du buffer de logs une fois chargé
    mainWindow.webContents.on('did-finish-load', () => {
        isWindowReady = true;
        global.systemLog('Interface chargée. Transfert des logs en attente...', 'info');
        logBuffer.forEach(log => {
            mainWindow.webContents.send('backend-log', log);
        });
        logBuffer = [];
    });

    // INDISPENSABLE : Affiche la fenêtre quand elle est prête
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.focus();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    startBackend();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
