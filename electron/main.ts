
import { app, BrowserWindow, BrowserView, ipcMain, Menu } from 'electron';
import * as path from 'path';
import { TabManager } from './TabManager';

import { BookmarksManager } from './managers/BookmarksManager';
import { SettingsManager } from './managers/SettingsManager';
import { DownloadManager } from './managers/DownloadManager';

// Manage multiple windows and their respective TabManagers
const windows = new Map<number, BrowserWindow>();
const tabManagers = new Map<number, TabManager>();

const bookmarksManager = new BookmarksManager();
const settingsManager = new SettingsManager();
const downloadManager = new DownloadManager();

function getTabManager(event: Electron.IpcMainInvokeEvent): TabManager | null {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) return null;
    return tabManagers.get(window.id) || null;
}

function createWindow(options: { incognito?: boolean } = {}) {
    const { incognito = false } = options;

    const window = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false, // Disable sandbox to prevent V8 crashes on macOS
            webSecurity: true,
            partition: incognito ? 'incognito' : 'persist:main',
        },
    });

    const windowId = window.id;
    windows.set(windowId, window);

    // Create a new TabManager for this window
    const tabManager = new TabManager();
    tabManager.setMainWindow(window);
    tabManagers.set(windowId, tabManager);

    // Update download manager to track this window (simplified for now, might need better multi-window handling)
    downloadManager.setMainWindow(window);

    // Handle downloads for this window's session
    window.webContents.session.on('will-download', (event, item, webContents) => {
        downloadManager.handleWillDownload(event, item, webContents);
    });

    // Load the React app
    if (process.env.NODE_ENV === 'development') {
        const loadURLWithRetry = (url: string, retries = 5) => {
            window.loadURL(url).catch((err) => {
                if (retries > 0) {
                    console.log(`Failed to load URL, retrying... (${retries} attempts left)`);
                    setTimeout(() => loadURLWithRetry(url, retries - 1), 1000);
                } else {
                    console.error('Failed to load URL:', err);
                }
            });
        };
        loadURLWithRetry('http://localhost:5173');
    } else {
        window.loadFile(path.join(__dirname, '../index.html'));
    }

    window.on('closed', () => {
        windows.delete(windowId);
        tabManagers.delete(windowId);
    });

    // Add keyboard shortcut to open DevTools in detached mode
    window.webContents.on('before-input-event', (event, input) => {
        // Cmd+Option+I on Mac, Ctrl+Shift+I on Windows/Linux
        if ((input.meta && input.alt && input.key.toLowerCase() === 'i') ||
            (input.control && input.shift && input.key.toLowerCase() === 'i')) {
            event.preventDefault();

            // Try to open DevTools for active tab's BrowserView first
            const activeTabId = tabManager.getActiveTabId();
            if (activeTabId) {
                tabManager.openDevToolsForActiveTab();
            } else {
                // Fallback to main window DevTools (for React UI)
                window.webContents.openDevTools({ mode: 'detach' });
            }
        }
    });

    // Handle window resize to reposition BrowserViews
    window.on('resize', () => {
        tabManager.repositionViews(window);
    });

    // Handle window move to reposition BrowserViews
    window.on('move', () => {
        tabManager.repositionViews(window);
    });
}

// IPC Handlers
ipcMain.handle('create-tab', async (event, url: string) => {
    const tm = getTabManager(event);
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!tm || !win) return null;
    return tm.createTab(win, url);
});

ipcMain.handle('close-tab', async (event, tabId: string) => {
    const tm = getTabManager(event);
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!tm || !win) return;
    tm.closeTab(win, tabId);
});

ipcMain.handle('switch-tab', async (event, tabId: string) => {
    const tm = getTabManager(event);
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!tm || !win) return;
    tm.switchTab(win, tabId);
});

ipcMain.handle('navigate-tab', async (event, tabId: string, url: string) => {
    const tm = getTabManager(event);
    if (!tm) return;
    tm.navigateTab(tabId, url);
});

ipcMain.handle('go-back', async (event, tabId: string) => {
    const tm = getTabManager(event);
    if (!tm) return;
    tm.goBack(tabId);
});

ipcMain.handle('go-forward', async (event, tabId: string) => {
    const tm = getTabManager(event);
    if (!tm) return;
    tm.goForward(tabId);
});

ipcMain.handle('refresh-tab', async (event, tabId: string) => {
    const tm = getTabManager(event);
    if (!tm) return;
    tm.refreshTab(tabId);
});

ipcMain.handle('get-tabs', async (event) => {
    const tm = getTabManager(event);
    if (!tm) return [];
    return tm.getTabs();
});

ipcMain.handle('get-active-tab', async (event) => {
    const tm = getTabManager(event);
    if (!tm) return null;
    return tm.getActiveTabId();
});

ipcMain.handle('open-devtools', async (event) => {
    const tm = getTabManager(event);
    if (!tm) return;
    tm.openDevToolsForActiveTab();
});

ipcMain.handle('get-top-sites', async (event) => {
    const tm = getTabManager(event);
    if (!tm) return [];
    return tm.getTopSites();
});

ipcMain.handle('create-incognito-window', async () => {
    createWindow({ incognito: true });
});

ipcMain.handle('open-browser-menu', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;

    const menu = Menu.buildFromTemplate([
        {
            label: 'New Incognito Window',
            click: () => {
                createWindow({ incognito: true });
            }
        },
        { type: 'separator' },
        {
            label: 'Settings',
            click: () => {
                const tm = getTabManager(event);
                if (tm) {
                    const activeTabId = tm.getActiveTabId();
                    if (activeTabId) {
                        tm.navigateTab(activeTabId, 'neuralweb://settings');
                    }
                }
            }
        }
    ]);

    menu.popup({ window: win });
});

ipcMain.handle('is-incognito', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return false;
    // Incognito sessions are not persistent
    return !win.webContents.session.isPersistent();
});

// Bookmarks IPC
ipcMain.handle('bookmarks:get', async () => {
    return bookmarksManager.getTree();
});

ipcMain.handle('bookmarks:add', async (event, bookmark) => {
    return bookmarksManager.addBookmark(bookmark);
});

ipcMain.handle('bookmarks:remove', async (event, id) => {
    return bookmarksManager.removeBookmark(id);
});

ipcMain.handle('bookmarks:check', async (event, url) => {
    return bookmarksManager.isBookmarked(url);
});

ipcMain.handle('bookmarks:getByUrl', async (event, url) => {
    return bookmarksManager.getBookmarkByUrl(url);
});

// Downloads IPC
ipcMain.handle('downloads:get-history', async () => {
    return downloadManager.getHistory();
});

ipcMain.handle('downloads:pause', async (event, id) => {
    downloadManager.pause(id);
});

ipcMain.handle('downloads:resume', async (event, id) => {
    downloadManager.resume(id);
});

ipcMain.handle('downloads:cancel', async (event, id) => {
    downloadManager.cancel(id);
});

ipcMain.handle('downloads:open-file', async (event, id) => {
    downloadManager.openFile(id);
});

ipcMain.handle('downloads:clear', async () => {
    downloadManager.clearHistory();
});

// Settings IPC
ipcMain.handle('settings:get', async () => {
    return settingsManager.getSettings();
});

ipcMain.handle('settings:set', async (event, key, value) => {
    settingsManager.set(key, value);
    // Notify renderer of update if needed, or just let it pull
    return true;
});

// App lifecycle
app.whenReady().then(() => createWindow());

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (windows.size === 0) {
        createWindow();
    }
});
