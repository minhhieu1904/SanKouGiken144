const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        autoHideMenuBar: true,
    });

    // Open DevTools
    // win.webContents.openDevTools();

    win.loadFile('index.html');
}

// already window
app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    })
})

// close window
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
})

// Handle read Excel request from renderer
ipcMain.on('print-html', (event, html) => {
    const tmpFile = path.join(os.tmpdir(), `print_${Date.now()}.html`);
    fs.writeFileSync(tmpFile, html, 'utf-8');

    const win = new BrowserWindow({
        show: false,
        webPreferences: {
            allowRunningInsecureContent: true,
            webSecurity: false
        }
    });
    win.loadFile(tmpFile);

    win.webContents.once('did-finish-load', () => {
        win.webContents.print({ silent: false, printBackground: true }, (success, error) => {
            win.close();
            fs.unlinkSync(tmpFile);
        });
    });
});