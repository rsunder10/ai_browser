import { app, BrowserWindow, BrowserView, ipcMain } from 'electron';
import * as path from 'path';
import { TabManager } from './TabManager';

let mainWindow: BrowserWindow | null = null;
const tabManager = new TabManager();

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false, // Disable sandbox to prevent V8 crashes on macOS
            webSecurity: true,
        },
    });

    // Set main window reference in TabManager
    tabManager.setMainWindow(mainWindow);

    // Load the React app
    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:5174').catch((err) => {
            console.error('Failed to load URL:', err);
        });
        // DevTools can be opened manually with Cmd+Option+I or View > Toggle Developer Tools
    } else {
        mainWindow.loadFile(path.join(__dirname, '../index.html'));
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Add keyboard shortcut to open DevTools in detached mode
    mainWindow.webContents.on('before-input-event', (event, input) => {
        // Cmd+Option+I on Mac, Ctrl+Shift+I on Windows/Linux
        if ((input.meta && input.alt && input.key.toLowerCase() === 'i') ||
            (input.control && input.shift && input.key.toLowerCase() === 'i')) {
            if (mainWindow) {
                mainWindow.webContents.openDevTools({ mode: 'detach' });
            }
            event.preventDefault();
        }
    });

    // Handle window resize to reposition BrowserViews
    mainWindow.on('resize', () => {
        if (mainWindow) {
            tabManager.repositionViews(mainWindow);
        }
    });

    // Handle window move to reposition BrowserViews
    mainWindow.on('move', () => {
        if (mainWindow) {
            tabManager.repositionViews(mainWindow);
        }
    });
}

// IPC Handlers
ipcMain.handle('create-tab', async (event, url: string) => {
    if (!mainWindow) return null;
    return tabManager.createTab(mainWindow, url);
});

ipcMain.handle('close-tab', async (event, tabId: string) => {
    if (!mainWindow) return;
    tabManager.closeTab(mainWindow, tabId);
});

ipcMain.handle('switch-tab', async (event, tabId: string) => {
    if (!mainWindow) return;
    tabManager.switchTab(mainWindow, tabId);
});

ipcMain.handle('navigate-tab', async (event, tabId: string, url: string) => {
    tabManager.navigateTab(tabId, url);
});

ipcMain.handle('go-back', async (event, tabId: string) => {
    tabManager.goBack(tabId);
});

ipcMain.handle('go-forward', async (event, tabId: string) => {
    tabManager.goForward(tabId);
});

ipcMain.handle('refresh-tab', async (event, tabId: string) => {
    tabManager.refreshTab(tabId);
});

ipcMain.handle('get-tabs', async () => {
    return tabManager.getTabs();
});

ipcMain.handle('get-active-tab', async () => {
    return tabManager.getActiveTabId();
});

// App lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
